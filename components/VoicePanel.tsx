import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadedFile } from '../types';
import { LiveSession } from '../services/liveService';
import { MicrophoneIcon, StopIcon, UserIcon, BotIcon } from './icons';

interface VoicePanelProps {
  files: UploadedFile[];
}

interface TranscriptTurn {
    id: string;
    userInput: string;
    botOutput: string;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

const VoicePanel: React.FC<VoicePanelProps> = ({ files }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [liveUserInput, setLiveUserInput] = useState('');
  const [liveBotOutput, setLiveBotOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const hasFiles = files.length > 0;

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, liveUserInput, liveBotOutput]);


  const handleStartConversation = useCallback(() => {
    if (!hasFiles) return;

    setConnectionState('connecting');
    setError(null);
    setTranscript([]);
    setLiveUserInput('');
    setLiveBotOutput('');

    const liveSession = new LiveSession({
        onConnect: () => {
            setConnectionState('connected');
        },
        onDisconnect: () => {
            setConnectionState('idle');
        },
        onError: (err) => {
            setError(err.message || 'An unknown error occurred.');
            setConnectionState('error');
        },
        onTranscriptionUpdate: ({ userInput, botOutput, isFinal }) => {
            if (isFinal) {
                if(userInput || botOutput) {
                    setTranscript(prev => [...prev, { id: `turn-${Date.now()}`, userInput, botOutput }]);
                }
                setLiveUserInput('');
                setLiveBotOutput('');
            } else {
                setLiveUserInput(userInput);
                setLiveBotOutput(botOutput);
            }
        },
    });

    sessionRef.current = liveSession;
    liveSession.connect(files);
  }, [files, hasFiles]);

  const handleStopConversation = () => {
    sessionRef.current?.close();
  };

  const getButtonState = () => {
    switch(connectionState) {
        case 'idle':
        case 'error':
            return {
                text: 'Start Conversation',
                icon: <MicrophoneIcon className="w-8 h-8"/>,
                action: handleStartConversation,
                disabled: !hasFiles,
                className: 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600'
            };
        case 'connecting':
            return {
                text: 'Connecting...',
                icon: <div className="w-7 h-7 border-4 border-gray-400 border-t-white rounded-full animate-spin"></div>,
                action: () => {},
                disabled: true,
                className: 'bg-gray-600'
            };
        case 'connected':
             return {
                text: 'Stop Conversation',
                icon: <StopIcon className="w-8 h-8"/>,
                action: handleStopConversation,
                disabled: false,
                className: 'bg-red-600 hover:bg-red-700'
            };
    }
  }
  const buttonState = getButtonState();

  const WelcomeMessage = () => (
    <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
            Gemini Voice Chat
        </h1>
        <p className="text-gray-400">
            {hasFiles 
                ? "Press the button below to start talking."
                : "Please upload a document to begin the chat."
            }
        </p>
         <p className="text-xs text-gray-500 mt-2">
            Note: Voice chat is grounded in text-based documents (.txt, .md) only.
        </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 overflow-y-auto">
        {transcript.length === 0 && !liveUserInput && !liveBotOutput && (
            <div className="h-full flex flex-col justify-center items-center">
                <WelcomeMessage />
            </div>
        )}

        <div className="space-y-6">
            {transcript.map(turn => (
                <div key={turn.id}>
                    {turn.userInput && <div className="flex gap-3 justify-end">
                        <div className="max-w-xl p-3 rounded-lg bg-indigo-600">
                            <p className="text-white whitespace-pre-wrap">{turn.userInput}</p>
                        </div>
                        <UserIcon className="w-8 h-8 flex-shrink-0 text-gray-400" />
                    </div>}
                    {turn.botOutput && <div className="flex gap-3 mt-4">
                        <BotIcon className="w-8 h-8 flex-shrink-0 text-indigo-400" />
                        <div className="max-w-xl p-3 rounded-lg bg-gray-700">
                             <p className="text-white whitespace-pre-wrap">{turn.botOutput}</p>
                        </div>
                    </div>}
                </div>
            ))}
            {/* Live Transcript */}
            { (liveUserInput || liveBotOutput) && (
                <div>
                     {liveUserInput && <div className="flex gap-3 justify-end opacity-70">
                        <div className="max-w-xl p-3 rounded-lg bg-indigo-600">
                            <p className="text-white whitespace-pre-wrap">{liveUserInput}</p>
                        </div>
                        <UserIcon className="w-8 h-8 flex-shrink-0 text-gray-400" />
                    </div>}
                     {liveBotOutput && <div className="flex gap-3 mt-4 opacity-70">
                        <BotIcon className="w-8 h-8 flex-shrink-0 text-indigo-400" />
                        <div className="max-w-xl p-3 rounded-lg bg-gray-700">
                             <p className="text-white whitespace-pre-wrap">{liveBotOutput}</p>
                        </div>
                    </div>}
                </div>
            )}
             <div ref={transcriptEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-gray-700 flex flex-col items-center justify-center">
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <button
            onClick={buttonState.action}
            disabled={buttonState.disabled}
            className={`flex items-center justify-center gap-3 w-56 h-16 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:cursor-not-allowed ${buttonState.className}`}
        >
            {buttonState.icon}
            <span>{buttonState.text}</span>
        </button>
      </div>
    </div>
  );
};

export default VoicePanel;
