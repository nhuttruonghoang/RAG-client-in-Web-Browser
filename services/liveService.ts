import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { UploadedFile } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

// Constants for audio processing
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

export interface LiveSessionCallbacks {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onTranscriptionUpdate: (transcription: { userInput: string, botOutput: string, isFinal: boolean }) => void;
}

export class LiveSession {
    private ai: GoogleGenAI;
    private callbacks: LiveSessionCallbacks;
    private sessionPromise: Promise<any> | null = null;
    
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private outputNode: GainNode | null = null;
    private sources = new Set<AudioBufferSourceNode>();
    private nextStartTime = 0;

    constructor(callbacks: LiveSessionCallbacks) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.callbacks = callbacks;
    }

    private buildSystemInstruction(files: UploadedFile[]): string {
        const textFiles = files.filter(f => 
            f.type.startsWith('text/') || 
            f.name.endsWith('.md') || 
            f.name.endsWith('.txt')
        );
        
        if (textFiles.length === 0) {
            return 'You are a helpful assistant. Please inform the user that they need to upload text documents to have a conversation about them. If they have uploaded other file types like PDFs or images, explain that the voice assistant can currently only read plain text files, but the text chat can understand all uploaded formats. Speak in Vietnamese.';
        }

        const fileContents = textFiles.map(file => {
            try {
                const bytes = decode(file.data);
                const decodedText = new TextDecoder().decode(bytes);
                return `Document: ${file.name}\nContent:\n${decodedText}`;
            } catch (e) {
                console.warn(`Could not decode file: ${file.name}`, e);
                return `Document: ${file.name}\nContent: [Could not decode content]`;
            }
        }).join('\n\n---\n\n');

        return `You are a helpful assistant. Your answers must be based ONLY on the content of the following documents. Speak in Vietnamese. Do not use any external knowledge. If the answer cannot be found in the documents, state clearly that the information is not available in the provided materials.\n\nHere are the documents:\n${fileContents}`;
    }

    async connect(files: UploadedFile[]) {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // FIX: Cast window to any to allow webkitAudioContext for older browser compatibility.
            this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            // FIX: Cast window to any to allow webkitAudioContext for older browser compatibility.
            this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

            this.outputNode = this.outputAudioContext.createGain();
            this.outputNode.connect(this.outputAudioContext.destination);

            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            const systemInstruction = this.buildSystemInstruction(files);

            this.sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        this.callbacks.onConnect?.();
                        const source = this.inputAudioContext!.createMediaStreamSource(this.mediaStream!);
                        this.scriptProcessor = this.inputAudioContext!.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);

                        this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            this.sessionPromise?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(this.scriptProcessor);
                        this.scriptProcessor.connect(this.inputAudioContext!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                            this.callbacks.onTranscriptionUpdate({ userInput: currentInputTranscription, botOutput: currentOutputTranscription, isFinal: false });
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                             this.callbacks.onTranscriptionUpdate({ userInput: currentInputTranscription, botOutput: currentOutputTranscription, isFinal: false });
                        }
                        if (message.serverContent?.turnComplete) {
                            this.callbacks.onTranscriptionUpdate({ userInput: currentInputTranscription, botOutput: currentOutputTranscription, isFinal: true });
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }

                        // Handle audio playback
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            this.playAudio(audioData);
                        }

                        if (message.serverContent?.interrupted) {
                            this.stopAllPlayback();
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API Error:', e);
                        this.callbacks.onError?.(new Error('A connection error occurred.'));
                        this.close();
                    },
                    onclose: (e: CloseEvent) => {
                        this.close();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (error) {
            console.error('Failed to start voice session:', error);
            this.callbacks.onError?.(error as Error);
            this.close();
        }
    }

    private async playAudio(base64Audio: string) {
        if (!this.outputAudioContext || !this.outputNode) return;
        
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            this.outputAudioContext,
            OUTPUT_SAMPLE_RATE,
            1,
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        
        source.addEventListener('ended', () => {
            this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
    }
    
    private stopAllPlayback() {
        for (const source of this.sources.values()) {
            source.stop();
            this.sources.delete(source);
        }
        this.nextStartTime = 0;
    }

    close() {
        this.sessionPromise?.then(session => session.close()).catch(console.error);
        this.sessionPromise = null;
        
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
        
        this.scriptProcessor?.disconnect();
        this.scriptProcessor = null;
        
        this.inputAudioContext?.close().catch(console.error);
        this.inputAudioContext = null;
        
        this.outputAudioContext?.close().catch(console.error);
        this.outputAudioContext = null;

        this.stopAllPlayback();
        
        this.callbacks.onDisconnect?.();
    }
}