import React from 'react';
import { useGameStore } from '../store/useGameStore';

interface HUDProps {
  onToggleStoreStatus?: () => void;
  onOpenSupplier: () => void;
  gameSpeed?: number;
  onToggleGameSpeed?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  onToggleStoreStatus,
  onOpenSupplier,
  gameSpeed = 1,
  onToggleGameSpeed,
}) => {
  const { player, worldTime, timeString, toggleInventoryModal, toggleSaveModal } = useGameStore();

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-1.5 sm:p-2.5">
      <div className="pointer-events-auto bg-[#e5d5be] border-2 border-[#8c745d] rounded-lg shadow-md px-2.5 py-1.5 flex flex-wrap justify-between items-center gap-2 select-none">
        {/* Left: Date, Time & Current Store Event */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <div className="text-xs sm:text-sm font-bold text-[#3d2b1f] font-mono tracking-wide flex items-center gap-1.5">
              <span>Ngày {worldTime.day}</span>
              <span className="text-[#8c745d]">·</span>
              <span className="font-extrabold">{timeString}</span>
            </div>
            <div className="text-[10px] text-[#6d5543] font-medium flex items-center gap-1">
              <span>🍲</span>
              <span>Bữa ăn gia đình · Ca sáng</span>
            </div>
          </div>
        </div>

        {/* Center: Stat Badges matching reference photo */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold font-mono">
          {/* Customers Inside / Capacity */}
          <div className="bg-[#f5ece0] border border-[#a89078] px-2 py-1 rounded flex items-center gap-1 text-[#3d2b1f] shadow-xs">
            <span>👤</span>
            <span>0/12</span>
          </div>

          {/* Money in VND */}
          <div className="bg-[#f5ece0] border border-[#a89078] px-2.5 py-1 rounded flex items-center gap-1.5 text-[#b07d18] shadow-xs">
            <span className="w-4 h-4 rounded-full bg-[#f4a261] border border-[#d48b28] text-[10px] flex items-center justify-center text-white font-bold">
              đ
            </span>
            <span className="font-extrabold text-[#7c560d]">
              {player.money.toLocaleString('vi-VN')}
            </span>
          </div>

          {/* Heart / Reputation */}
          <div className="bg-[#f5ece0] border border-[#a89078] px-2 py-1 rounded flex items-center gap-1 text-[#b7094c] shadow-xs">
            <span>❤️</span>
            <span className="font-extrabold">{player.reputation || 95}</span>
          </div>
        </div>

        {/* Right: Stardew Valley & Reference Style Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold">
          {/* Quản lí (Inventory/Ledger) */}
          <button
            onClick={toggleInventoryModal}
            className="bg-[#d4b998] hover:bg-[#c4a682] active:translate-y-0.5 text-[#3d2b1f] border border-[#8c745d] rounded px-2.5 py-1 flex items-center gap-1 shadow-xs transition-transform"
            title="Mở sổ quản lí hàng hóa [Tab / I]"
          >
            <span>🛒</span>
            <span className="hidden md:inline">Quản lí</span>
          </button>

          {/* Nhập hàng (Supplier) */}
          <button
            onClick={onOpenSupplier}
            className="bg-[#d4b998] hover:bg-[#c4a682] active:translate-y-0.5 text-[#3d2b1f] border border-[#8c745d] rounded px-2 py-1 flex items-center gap-1 shadow-xs transition-transform"
            title="Đặt hàng đại lý giao đến tiệm"
          >
            <span>🚚</span>
            <span className="hidden sm:inline">Nhập hàng</span>
          </button>

          {/* Game Speed Toggle: 1x / 2x */}
          <button
            onClick={onToggleGameSpeed}
            className="bg-[#d4b998] hover:bg-[#c4a682] active:translate-y-0.5 text-[#3d2b1f] border border-[#8c745d] rounded px-2 py-1 flex items-center gap-1 shadow-xs transition-transform font-mono"
            title="Đổi tốc độ thời gian"
          >
            <span>▶</span>
            <span>{gameSpeed}x</span>
          </button>

          {/* Store Open/Close Button */}
          <button
            onClick={onToggleStoreStatus}
            className={`border rounded px-2.5 py-1 flex items-center gap-1 shadow-xs transition-all active:translate-y-0.5 ${
              worldTime.isStoreOpen
                ? 'bg-[#e29578] hover:bg-[#d47f60] text-[#4a180d] border-[#b06145]'
                : 'bg-[#83c5be] hover:bg-[#68aba4] text-[#0d3b38] border-[#4d8f88]'
            }`}
            title="Mở hoặc đóng cửa tiệm đón khách"
          >
            <span>{worldTime.isStoreOpen ? '✖' : '✔'}</span>
            <span className="hidden sm:inline">
              {worldTime.isStoreOpen ? 'Đóng cửa' : 'Mở cửa'}
            </span>
          </button>

          {/* Save Game Button */}
          <button
            onClick={toggleSaveModal}
            className="bg-[#d4b998] hover:bg-[#c4a682] active:translate-y-0.5 text-[#3d2b1f] border border-[#8c745d] rounded px-2 py-1 flex items-center gap-1 shadow-xs transition-transform"
            title="Lưu tiến trình vào máy"
          >
            <span>💾</span>
          </button>
        </div>
      </div>
    </header>
  );
};
