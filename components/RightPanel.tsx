import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import VoicePanel from './VoicePanel';
import { UploadedFile } from '../types';
import { ChatBubbleIcon, VoiceIcon } from './icons';

interface RightPanelProps {
  files: UploadedFile[];
}

type Mode = 'text' | 'voice';

const RightPanel: React.FC<RightPanelProps> = ({ files }) => {
  const [mode, setMode] = useState<Mode>('text');

  const TabButton: React.FC<{
    label: string,
    icon: React.ReactNode,
    currentMode: Mode,
    targetMode: Mode
  }> = ({ label, icon, currentMode, targetMode }) => {
    const isActive = currentMode === targetMode;
    return (
      <button
        onClick={() => setMode(targetMode)}
        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
          isActive
            ? 'border-indigo-500 text-white'
            : 'border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
        }`}
        aria-pressed={isActive}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-700">
        <TabButton label="Text Chat" icon={<ChatBubbleIcon className="w-5 h-5" />} currentMode={mode} targetMode="text" />
        <TabButton label="Voice Chat" icon={<VoiceIcon className="w-5 h-5" />} currentMode={mode} targetMode="voice" />
      </div>

      <div className="flex-grow overflow-hidden">
        {mode === 'text' && <ChatPanel files={files} />}
        {mode === 'voice' && <VoicePanel files={files} />}
      </div>
    </div>
  );
};

export default RightPanel;
