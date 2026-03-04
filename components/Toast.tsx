import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-8 fade-in duration-300 ${
              toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
              'bg-blue-50 border-blue-100 text-blue-800'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            
            <span className="text-sm font-medium">{toast.message}</span>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
