import React, { useState, useEffect, useCallback } from 'react';
import FilePanel from './components/FilePanel';
import ChatPanel from './components/ChatPanel';
import { UploadedFile } from './types';
import * as db from './services/db';
import { readFileAsBase64 } from './utils/helpers';

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      const storedFiles = await db.getAllFiles();
      setFiles(storedFiles);
      setIsLoading(false);
    };
    loadFiles();
  }, []);

  const handleAddFiles = useCallback(async (newFiles: FileList) => {
    const uploadedFiles: UploadedFile[] = [];
    for (const file of Array.from(newFiles)) {
        try {
            const base64Data = await readFileAsBase64(file);
            const newFile: UploadedFile = {
                id: `file-${Date.now()}-${Math.random()}`,
                name: file.name,
                type: file.type || 'application/octet-stream',
                data: base64Data,
            };
            await db.addFile(newFile);
            uploadedFiles.push(newFile);
        } catch (error) {
            console.error("Error processing file:", file.name, error);
        }
    }
    setFiles(prevFiles => [...prevFiles, ...uploadedFiles]);
  }, []);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    await db.deleteFile(fileId);
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  }, []);

  const handleClearFiles = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
        await db.clearFiles();
        setFiles([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <main className="container mx-auto max-w-7xl h-[calc(100vh-2rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          <div className="md:col-span-1 h-full">
            <FilePanel 
              files={files} 
              onAddFiles={handleAddFiles}
              onDeleteFile={handleDeleteFile}
              onClearFiles={handleClearFiles}
              isLoading={isLoading}
            />
          </div>
          <div className="md:col-span-2 h-full">
            <ChatPanel files={files} />
          </div>
        </div>
      </main>
      <style>{`
        /* Styles from previous version remain unchanged */
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
        }
        .markdown-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; color: #d1d5db; }
        .markdown-content th, .markdown-content td { border: 1px solid #4b5563; padding: 0.5rem 0.75rem; text-align: left; }
        .markdown-content th { background-color: #1f2937; font-weight: 600; }
        .markdown-content tr:nth-child(even) { background-color: rgba(31, 41, 55, 0.5); }
        .markdown-content ul, .markdown-content ol { padding-left: 1.5rem; margin: 0.75rem 0; }
        .markdown-content li { margin-bottom: 0.5rem; }
        .markdown-content strong { font-weight: 700; color: #fff; }
        .markdown-content p { line-height: 1.6; }
        .markdown-content p:not(:last-child) { margin-bottom: 1rem; }
        .markdown-content td p:last-child, .markdown-content th p:last-child, .markdown-content li p:last-child { margin-bottom: 0; }
        .markdown-content br { display: block; content: ""; margin-top: 0.5rem; }
      `}</style>
    </div>
  );
}

export default App;
