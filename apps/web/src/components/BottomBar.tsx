import React from 'react';

export const BottomBar: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-1 sm:p-2">
      <div className="bg-[#e5d5be]/95 border-2 border-[#8c745d] rounded px-3 py-1.5 shadow text-[#3d2b1f] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] leading-tight select-none backdrop-blur-xs">
        <div className="font-semibold text-[#5a4231]">
          Bán hàng · Ca sáng · Theo dõi kệ hàng và kiểm tra hòm tiền lẻ
        </div>
        <div className="font-mono text-[#7a5c43] mt-0.5 sm:mt-0 font-medium flex gap-2">
          <span><b>WASD</b>: Di chuyển</span>
          <span><b>E / Space</b>: Bày hàng</span>
          <span><b>Tab / I</b>: Quản lí</span>
        </div>
      </div>
    </footer>
  );
};
