import React from 'react';
import { useGameStore } from '../store/useGameStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGameStore();

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[#d4a373]';
        let bgClass = 'bg-[#2b1e16]/95';

        if (toast.type === 'success') {
          borderClass = 'border-[#52b788]';
          bgClass = 'bg-[#1b4332]/95';
        } else if (toast.type === 'warn') {
          borderClass = 'border-[#e63946]';
          bgClass = 'bg-[#540b0e]/95';
        }

        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto border-2 ${borderClass} ${bgClass} text-[#f4ecd8] px-4 py-2 rounded-lg shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 backdrop-blur-sm animate-fade-in cursor-pointer transition-all`}
          >
            <span>{toast.type === 'success' ? '✅' : toast.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
