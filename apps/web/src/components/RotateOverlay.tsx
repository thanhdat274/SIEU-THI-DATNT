import React, { useState, useEffect } from 'react';

export const RotateOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check window aspect ratio: if height > width and width < 768px
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1b1c1e] text-[#ffd166] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-20 h-20 rounded-2xl bg-[#583101] border-4 border-[#ffd166] flex items-center justify-center text-4xl mb-4 shadow-2xl animate-bounce">
        📱🔄
      </div>
      <h2 className="text-xl font-bold mb-2 tracking-wide">
        VUI LÒNG XOAY NGANG THIẾT BỊ
      </h2>
      <p className="text-xs text-[#faedcd]/80 max-w-xs leading-relaxed">
        Để có trải nghiệm quản lý "Tiệm Tạp Hóa Đầu Hẻm" tốt nhất và góc nhìn bao quát toàn bộ cửa tiệm, xin bạn vui lòng xoay ngang màn hình điện thoại.
      </p>
    </div>
  );
};
