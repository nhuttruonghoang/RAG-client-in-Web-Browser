
import { GoogleGenAI } from "@google/genai";
import { UploadedFile } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-pro';

const fileToPart = (file: UploadedFile) => {
  return {
    inlineData: {
      mimeType: file.type,
      data: file.data,
    },
  };
};

export const askWithFiles = async (question: string, files: UploadedFile[]): Promise<string> => {
  try {
    const promptParts = [
      ...files.map(fileToPart),
      { text: `Based strictly on the provided documents, answer the following question: "${question}". Do not use any external knowledge. If the answer cannot be found in the documents, state that clearly.` },
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: promptParts }],
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred: ${error.message}`;
    }
    return "An unknown error occurred while contacting the AI.";
  }
};
