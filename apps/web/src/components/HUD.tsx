import React from 'react';
import { useGameStore } from '../store/useGameStore';

interface HUDProps {
  onToggleStoreStatus?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ onToggleStoreStatus }) => {
  const { player, worldTime, timeString, toggleInventoryModal, toggleSaveModal } = useGameStore();

  const xpPercentage = Math.min(
    100,
    Math.round((player.experience / player.experienceToNextLevel) * 100)
  );

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-2 sm:p-3 flex flex-wrap justify-between items-start gap-2">
      {/* Left: Player Profile & Level */}
      <div className="pointer-events-auto bg-[#2b1e16]/90 border-2 border-[#d4a373] rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#583101] border-2 border-[#ffd166] flex items-center justify-center text-xl shadow-inner">
          🏪
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#ffd166] tracking-wide">
              {player.name}
            </span>
            <span className="bg-[#b7094c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#ffd166]/50">
              Cấp {player.level}
            </span>
          </div>
          {/* XP Bar */}
          <div className="w-28 sm:w-36 bg-[#1b1c1e] h-2 rounded-full overflow-hidden border border-[#d4a373]/50 mt-1">
            <div
              className="bg-gradient-to-r from-[#2a9d8f] to-[#e76f51] h-full transition-all duration-300"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center: Clock & Shop Status */}
      <div className="pointer-events-auto bg-[#2b1e16]/90 border-2 border-[#d4a373] rounded-lg px-4 py-1.5 shadow-lg backdrop-blur-sm flex items-center gap-3 text-center">
        <div>
          <div className="text-[11px] text-[#f4ecd8]/70 font-medium">
            Ngày {worldTime.day}
          </div>
          <div className="text-lg font-mono font-bold text-[#ffd166] tracking-wider">
            {timeString}
          </div>
        </div>
        <button
          onClick={onToggleStoreStatus}
          className={`text-[11px] font-bold px-2 py-1 rounded transition-colors border ${
            worldTime.isStoreOpen
              ? 'bg-[#2d6a4f] text-white border-[#52b788] hover:bg-[#1b4332]'
              : 'bg-[#9e2a2b] text-white border-[#e63946] hover:bg-[#540b0e]'
          }`}
          title="Nhấn để đổi trạng thái mở/đóng tiệm"
        >
          {worldTime.isStoreOpen ? 'ĐANG MỞ CỬA' : 'ĐÃ ĐÓNG CỬA'}
        </button>
      </div>

      {/* Right: Currency & Action Buttons */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Money badge */}
        <div className="bg-[#2b1e16]/90 border-2 border-[#d4a373] rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-sm flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span className="text-base sm:text-lg font-mono font-bold text-[#ffd166]">
            {player.money.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Inventory button */}
        <button
          onClick={toggleInventoryModal}
          className="bg-[#8b5a2b] hover:bg-[#a06535] active:translate-y-0.5 text-white border-2 border-[#ffd166] rounded-lg px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all"
        >
          <span>📦</span>
          <span className="hidden sm:inline">Túi hàng [I]</span>
        </button>

        {/* Save button */}
        <button
          onClick={toggleSaveModal}
          className="bg-[#2d6a4f] hover:bg-[#1b4332] active:translate-y-0.5 text-white border-2 border-[#ffd166] rounded-lg px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all"
        >
          <span>💾</span>
          <span className="hidden sm:inline">Lưu game</span>
        </button>
      </div>
    </header>
  );
};
