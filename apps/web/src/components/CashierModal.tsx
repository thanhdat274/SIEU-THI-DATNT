import React from 'react';
import { StoreFixture, PlayerData, WorldTime } from '@game/shared';

interface CashierModalProps {
  fixture: StoreFixture;
  player: PlayerData;
  worldTime: WorldTime;
  onToggleStoreStatus: () => void;
  onAdvanceDay: () => void;
  onClose: () => void;
}

export const CashierModal: React.FC<CashierModalProps> = ({
  fixture,
  player,
  worldTime,
  onToggleStoreStatus,
  onAdvanceDay,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#2b1e16] border-4 border-[#d4a373] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-[#f4ecd8]">
        {/* Modal Header */}
        <div className="bg-[#583101] px-4 py-3 border-b-2 border-[#d4a373] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h2 className="text-base sm:text-lg font-bold text-[#ffd166] tracking-wide">
              {fixture.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#ffd166] hover:text-white text-lg font-bold px-2 py-0.5 rounded bg-[#8b5a2b] hover:bg-[#a06535] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Cash Drawer Status Card */}
          <div className="bg-[#1b1c1e] p-3 rounded-lg border border-[#d4a373]/40 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#faedcd]/70 font-medium">Tiền trong hòm gỗ:</div>
              <div className="text-xl font-mono font-bold text-[#ffd166]">
                {player.money.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#faedcd]/70 font-medium">Uy tín tiệm:</div>
              <div className="text-sm font-bold text-[#2a9d8f]">⭐ {player.reputation} điểm</div>
            </div>
          </div>

          {/* Store Operation Status */}
          <div className="bg-[#38271e] p-3 rounded-lg border border-[#d4a373]/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#faedcd]/80">Trạng thái tiệm: </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    worldTime.isStoreOpen
                      ? 'bg-[#2d6a4f] text-white border-[#52b788]'
                      : 'bg-[#9e2a2b] text-white border-[#e63946]'
                  }`}
                >
                  {worldTime.isStoreOpen ? 'ĐANG MỞ CỬA' : 'ĐÃ ĐÓNG CỬA'}
                </span>
              </div>

              <button
                onClick={onToggleStoreStatus}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  worldTime.isStoreOpen
                    ? 'bg-[#9e2a2b] hover:bg-[#782021] text-white border-[#e63946]'
                    : 'bg-[#2d6a4f] hover:bg-[#1b4332] text-white border-[#52b788]'
                }`}
              >
                {worldTime.isStoreOpen ? 'Đóng cửa tiệm' : 'Mở cửa đón khách'}
              </button>
            </div>

            <div className="text-xs text-[#faedcd]/80 leading-relaxed border-t border-[#583101] pt-2">
              💡 <span className="text-[#ffd166] font-semibold">Mẹo kinh doanh:</span> Giữ kệ hàng luôn đầy đủ mì tôm và nước ngọt để bà con trong hẻm ghé mua không bị hụt hẫng!
            </div>
          </div>

          {/* End of Day Action */}
          <div className="bg-[#241711] p-3 rounded-lg border border-[#583101] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#ffd166]">Kết thúc ngày buôn bán:</div>
              <div className="text-[11px] text-[#faedcd]/70">Chuyển sang 07:00 sáng ngày tiếp theo</div>
            </div>
            <button
              onClick={onAdvanceDay}
              className="bg-[#b7094c] hover:bg-[#8f0539] text-white text-xs font-bold px-3 py-2 rounded-lg border border-[#ffd166] transition-colors shadow"
            >
              🌙 Qua ngày mới
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#1e140f] px-4 py-3 border-t border-[#d4a373]/30 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#8b5a2b] hover:bg-[#a06535] text-white text-xs font-bold px-4 py-2 rounded-lg border border-[#ffd166] transition-colors"
          >
            Đóng [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
