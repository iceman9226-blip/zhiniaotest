import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileImage, FileType2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (base64: string, preview: string, sourceUrl: string | undefined, mimeType: string) => void;
  isAnalyzing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isAnalyzing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Paste Event (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing || isUploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) processFile(blob);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isAnalyzing, isUploading]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    
    // Support more formats
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("不支持的文件格式。请上传 JPG, PNG, WEBP 或 GIF 格式的图片。");
      return;
    }

    // Check file size (e.g., max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("文件过大。请上传小于 10MB 的图片。");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 50);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // Resize image to prevent payload too large errors
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1600;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = resizedDataUrl.split(',')[1];
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          setTimeout(() => {
            setIsUploading(false);
            onFileSelect(base64, resizedDataUrl, undefined, 'image/jpeg');
          }, 300);
        } else {
          // Fallback if canvas fails
          const base64 = result.split(',')[1];
          clearInterval(progressInterval);
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            onFileSelect(base64, result, undefined, file.type);
          }, 300);
        }
      };
      img.onerror = () => {
        clearInterval(progressInterval);
        setIsUploading(false);
        setErrorMsg("读取图片失败，请重试。");
      };
      img.src = result;
    };
    reader.onerror = () => {
      clearInterval(progressInterval);
      setIsUploading(false);
      setErrorMsg("读取文件失败，请重试。");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isAnalyzing || isUploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isAnalyzing || isUploading) return;
    
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col">
      <div 
        className={`relative w-full border-2 border-dashed rounded-2xl py-16 px-10 transition-all duration-300 ease-in-out ${
          dragActive ? 'border-[#FF8839] bg-[#FF8839]/5 scale-[1.02]' : 'border-slate-300 bg-white hover:border-[#FF8839]/50 hover:bg-slate-50'
        } ${(isAnalyzing || isUploading) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg, image/png, image/webp, image/gif"
          onChange={handleChange}
          disabled={isAnalyzing || isUploading}
        />

        <div className="flex flex-col items-center justify-center text-center space-y-5">
          <div className={`p-5 rounded-full transition-colors duration-300 ${dragActive ? 'bg-[#FF8839] text-white shadow-lg shadow-[#FF8839]/30' : 'bg-slate-100 text-slate-500'}`}>
            <Upload className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              点击上传或直接拖拽文件到此处
            </h3>
            <p className="text-sm text-slate-500">
              支持直接使用 <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-mono text-slate-600">Ctrl+V</kbd> 或 <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-mono text-slate-600">⌘+V</kbd> 粘贴截图
            </p>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="w-full max-w-xs mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                <span>正在处理图片...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#FF8839] h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg mt-4 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Instructions / Supported Formats */}
      <div className="text-center text-sm text-slate-500 py-5">
        支持 JPG, PNG, WEBP 格式，单张图片最大 10MB。建议上传包含完整上下文的高保真页面截图。
      </div>
    </div>
  );
};

export default FileUpload;