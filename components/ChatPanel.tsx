import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, UploadedFile } from '../types';
import { askWithFiles } from '../services/geminiService';
import { UserIcon, BotIcon, SendIcon } from './icons';

interface ChatPanelProps {
  files: UploadedFile[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ files }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const hasFiles = files.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !hasFiles) return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const botResponseText = await askWithFiles(input, files);

    const botMessage: ChatMessage = { id: `bot-${Date.now()}`, sender: 'bot', text: botResponseText };
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  const WelcomeMessage = () => (
    <div className="text-center p-8 h-full flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
            Gemini Document Chat
        </h1>
        <p className="text-gray-400">
            {hasFiles 
                ? "Ask me anything about the provided documents."
                : "Please upload a document to begin the chat."
            }
        </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg">
      <div className="flex-grow p-4 overflow-y-auto">
        {messages.length === 0 ? <WelcomeMessage /> : (
            <div className="space-y-6">
            {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'bot' && <BotIcon className="w-8 h-8 flex-shrink-0 text-indigo-400" />}
                <div className={`max-w-xl p-3 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                    {msg.sender === 'bot' ? (
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                    )}
                </div>
                {msg.sender === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0 text-gray-400" />}
                </div>
            ))}
            {isLoading && (
                 <div className="flex gap-3 animate-fade-in">
                    <BotIcon className="w-8 h-8 flex-shrink-0 text-indigo-400 animate-pulse" />
                    <div className="max-w-xl p-3 rounded-lg bg-gray-700">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasFiles ? "Ask a question about the documents..." : "Please upload documents to begin."}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white disabled:opacity-50"
            disabled={isLoading || !hasFiles}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !hasFiles}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            <SendIcon className="w-5 h-5"/>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
