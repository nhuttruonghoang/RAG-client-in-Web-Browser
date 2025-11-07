import React, { useRef } from 'react';
import { UploadedFile } from '../types';
import { FileIcon, UploadIcon, TrashIcon } from './icons';

interface FilePanelProps {
  files: UploadedFile[];
  onAddFiles: (files: FileList) => void;
  onDeleteFile: (id: string) => void;
  onClearFiles: () => void;
  isLoading: boolean;
}

const FilePanel: React.FC<FilePanelProps> = ({ files, onAddFiles, onDeleteFile, onClearFiles, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onAddFiles(event.target.files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-200">Knowledge Source</h2>
        {files.length > 0 && (
          <button
            onClick={onClearFiles}
            className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            aria-label="Clear all documents"
          >
            Clear All
          </button>
        )}
      </div>
      
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".txt,.pdf,.md,.docx,.jpg,.jpeg,.png"
      />

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">Loading documents...</p>
            </div>
        ) : files.length === 0 ? (
            <div className="text-center p-6 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center h-full">
                <p className="text-gray-400 mb-4">The knowledge base is empty.</p>
                <button
                    onClick={handleUploadClick}
                    className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <UploadIcon className="w-5 h-5" />
                    Upload Documents
                </button>
            </div>
        ) : (
          <>
            <button
                onClick={handleUploadClick}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors mb-4"
            >
                <UploadIcon className="w-5 h-5" />
                Upload More Documents
            </button>
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.id} className="bg-gray-700/50 rounded-md p-2 flex items-center justify-between group animate-fade-in">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 font-medium truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => onDeleteFile(file.id)}
                    className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete ${file.name}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default FilePanel;
