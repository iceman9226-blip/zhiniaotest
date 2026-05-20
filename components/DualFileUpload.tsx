import React, { useRef, useState } from 'react';
import { Upload, X, ArrowRight, MousePointer2 } from 'lucide-react';
import { useToast } from './Toast';

interface DualFileUploadProps {
  onCompareStart: (designBase64: string, devBase64: string, mimeType: string) => void;
  isAnalyzing: boolean;
}

const ImageBox = ({ title, imgData, onRemove, onUpload, isAnalyzing, showToast }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAnalyzing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("文件过大。请上传小于 10MB 的图片。", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      // Compress image for preview/history
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1200;

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
        let processedData = result;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          processedData = canvas.toDataURL('image/jpeg', 0.8);
        }
        
        onUpload(processedData, file.type);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-64 overflow-hidden transition-all bg-white/50 backdrop-blur-sm ${imgData ? 'border-transparent' : 'border-slate-300 hover:border-[#FF8839]'}`}>
      <input 
        type="file" 
        className="hidden" 
        ref={inputRef} 
        accept="image/jpeg, image/png, image/webp" 
        onChange={handleFileChange} 
      />
      
      {imgData ? (
        <div className="w-full h-full relative group">
          <img src={imgData} alt={title} className="w-full h-full object-contain bg-slate-100" />
          {!isAnalyzing && (
            <button 
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white px-3 py-2 text-sm font-medium">
            {title}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => inputRef.current?.click()}
          disabled={isAnalyzing}
          className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500 hover:text-[#FF8839] transition-colors gap-3"
        >
          <div className="bg-slate-100 p-3 rounded-full group-hover:bg-[#FF8839]/10">
            <Upload className="w-6 h-6 outline-none" />
          </div>
          <span className="font-medium">点击上传{title}</span>
        </button>
      )}
    </div>
  );
};

const DualFileUpload: React.FC<DualFileUploadProps> = ({ onCompareStart, isAnalyzing }) => {
  const [designImg, setDesignImg] = useState<string | null>(null);
  const [devImg, setDevImg] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const { showToast } = useToast();

  const handleStart = () => {
    if (!designImg || !devImg) {
      showToast('请同时上传设计图和开发环境截图', 'error');
      return;
    }
    const extractBase64 = (dataUrl: string) => dataUrl.split(',')[1];
    onCompareStart(extractBase64(designImg), extractBase64(devImg), mimeType);
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <ImageBox 
          title="设计原稿 (Design)" 
          imgData={designImg}
          onUpload={(data: string, type: string) => { setDesignImg(data); setMimeType(type); }}
          onRemove={() => setDesignImg(null)}
          isAnalyzing={isAnalyzing}
          showToast={showToast}
        />
        
        {/* Connection Element */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full border border-slate-200 shadow-sm items-center justify-center overflow-visible">
          <MousePointer2 className="w-5 h-5 text-slate-400" />
        </div>

        <ImageBox 
          title="实际开发截图 (Dev)" 
          imgData={devImg}
          onUpload={(data: string, type: string) => { setDevImg(data); setMimeType(type); }}
          onRemove={() => setDevImg(null)}
          isAnalyzing={isAnalyzing}
          showToast={showToast}
        />
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={handleStart}
          disabled={!designImg || !devImg || isAnalyzing}
          className="flex items-center gap-2 bg-[#FF8839] hover:bg-[#e67a33] text-white px-8 py-3 rounded-full font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF8839]/30 active:scale-95"
        >
          {isAnalyzing ? '正在对比走查...' : '开始对比走查'}
          {!isAnalyzing && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default DualFileUpload;
