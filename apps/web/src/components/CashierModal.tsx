import React from 'react';
import { StoreFixture, PlayerData, WorldTime, SaveGameData } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

interface CashierModalProps {
  fixture: StoreFixture;
  player: PlayerData;
  worldTime: WorldTime;
  shelves: StoreFixture[];
  statistics: SaveGameData['statistics'];
  onCheckout: (fixtureId: string) => void;
  onToggleStoreStatus: () => void;
  onAdvanceDay: () => void;
  onClose: () => void;
}

export const CashierModal: React.FC<CashierModalProps> = ({
  fixture,
  player,
  worldTime,
  shelves,
  statistics,
  onCheckout,
  onToggleStoreStatus,
  onAdvanceDay,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[#fcf4dc] border-4 border-[#7a4b26] ring-4 ring-[#402611] rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-[#3d2716]">
        {/* Modal Header */}
        <div className="bg-[#7a4b26] px-4 py-2.5 border-b-4 border-[#593215] flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h2 className="text-sm sm:text-base font-bold text-[#ffeaa7] tracking-wide font-mono">
              {fixture.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-[#a62b2b] hover:bg-[#852222] border-2 border-[#ffeaa7] text-white font-bold flex items-center justify-center text-sm shadow transition-all active:translate-y-0.5"
            title="Đóng [Esc]"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 bg-[#fcf4dc]">
          {/* Cash Drawer Status Card */}
          <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] flex items-center justify-between font-mono shadow-xs">
            <div>
              <div className="text-[11px] text-[#735841] font-semibold">Tiền mặt trong hòm gỗ:</div>
              <div className="text-lg sm:text-xl font-extrabold text-[#7a4b26]">
                {player.money.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#735841] font-semibold">Uy tín xóm:</div>
              <div className="text-sm font-bold text-[#2a6f44]">❤️ {player.reputation || 95} điểm</div>
            </div>
          </div>

          {/* Checkout Queue / Quick Sell */}
          <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] space-y-2 shadow-xs">
            <div className="flex justify-between text-xs font-bold text-[#7a4b26] font-mono">
              <span>Bán hàng tại quầy</span>
              <span>Đã phục vụ {statistics.totalCustomersServed} lượt</span>
            </div>
            <div className="text-[11px] text-[#735841] font-mono">
              Doanh thu tích lũy: <b className="text-[#2a6f44]">{statistics.totalRevenue.toLocaleString('vi-VN')} đ</b>
            </div>

            <div className="space-y-1.5 pt-1">
              {shelves.filter((shelf) => shelf.currentStock > 0 && shelf.assignedProductId && PRODUCT_MAP[shelf.assignedProductId]).map((shelf) => {
                const product = PRODUCT_MAP[shelf.assignedProductId!];
                return (
                  <div key={shelf.id} className="flex items-center justify-between gap-2 text-xs bg-[#ebdcc3] rounded-md p-2 border border-[#caa472] font-mono">
                    <span className="truncate">{product.name} (còn {shelf.currentStock})</span>
                    <button
                      disabled={!worldTime.isStoreOpen}
                      onClick={() => onCheckout(shelf.id)}
                      className="bg-[#2a6f44] hover:bg-[#1e5232] disabled:opacity-40 text-white font-bold px-2.5 py-1 rounded shadow-xs text-xs whitespace-nowrap active:translate-y-0.5"
                    >
                      Bán +{product.baseSellingPrice.toLocaleString('vi-VN')} đ
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Store Operation Status */}
          <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#634932]">Trạng thái tiệm: </span>
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                    worldTime.isStoreOpen
                      ? 'bg-[#83c5be] text-[#0d3b38] border-[#4d8f88]'
                      : 'bg-[#e29578] text-[#4a180d] border-[#b06145]'
                  }`}
                >
                  {worldTime.isStoreOpen ? 'ĐANG MỞ CỬA' : 'ĐÃ ĐÓNG CỬA'}
                </span>
              </div>

              <button
                onClick={onToggleStoreStatus}
                className={`text-xs font-bold font-mono px-3 py-1.5 rounded border shadow-xs transition-all active:translate-y-0.5 ${
                  worldTime.isStoreOpen
                    ? 'bg-[#e29578] hover:bg-[#d47f60] text-[#4a180d] border-[#b06145]'
                    : 'bg-[#83c5be] hover:bg-[#68aba4] text-[#0d3b38] border-[#4d8f88]'
                }`}
              >
                {worldTime.isStoreOpen ? 'Đóng cửa tiệm' : 'Mở cửa đón khách'}
              </button>
            </div>
          </div>

          {/* End of Day Action */}
          <div className="bg-[#ebdcc3] p-3 rounded-lg border-2 border-[#caa472] flex items-center justify-between shadow-xs">
            <div>
              <div className="text-xs font-bold text-[#7a4b26] font-mono">Kết thúc ngày buôn bán:</div>
              <div className="text-[11px] text-[#735841]">Chuyển sang 07:00 sáng ngày mới</div>
            </div>
            <button
              onClick={onAdvanceDay}
              className="bg-[#a62b2b] hover:bg-[#852222] active:translate-y-0.5 text-white text-xs font-bold font-mono px-3 py-1.5 rounded border border-[#ffeaa7]/50 shadow transition-all"
            >
              🌙 Qua ngày mới
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#ebdcc3] px-4 py-2.5 border-t-2 border-[#cbb694] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#7a4b26] hover:bg-[#633a1a] active:translate-y-0.5 text-[#ffeaa7] text-xs font-bold font-mono px-4 py-1.5 rounded border border-[#ffeaa7]/50 shadow transition-all"
          >
            Đóng [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
