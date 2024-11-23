import { useState, useRef } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { uploadFile } from '../utils/firebaseChat';

export default function FileUpload({ chatId, onFileUpload, onError }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setSelectedFiles(files);
    setUploading(true);
    
    try {
      const uploadedFiles = await Promise.all(
        files.map(file => 
          uploadFile(file, chatId, (progress) => {
            setProgress(progress);
          })
        )
      );

      onFileUpload(uploadedFiles);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const cancelUpload = () => {
    setSelectedFiles([]);
    setUploading(false);
    setProgress(0);
    fileInputRef.current.value = '';
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      
      <button
        onClick={() => fileInputRef.current.click()}
        disabled={uploading}
        className="button-secondary p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <PaperClipIcon className="h-5 w-5" />
      </button>

      {uploading && (
        <div className="absolute bottom-full right-0 mb-2 glass-panel p-3 rounded-lg min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Uploading...</span>
            <button
              onClick={cancelUpload}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-accent-blue h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="mt-2 text-xs text-white/70">
            {selectedFiles.map(file => (
              <div key={file.name} className="truncate">
                {file.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
