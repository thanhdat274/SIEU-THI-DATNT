import React from 'react';
import { InventoryItem } from '@game/shared';
import { PRODUCT_MAP, PRODUCT_CATEGORY_LABELS } from '@game/data';

interface InventoryModalProps {
  inventory: InventoryItem[];
  currentDay: number;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ inventory, currentDay, onClose }) => {
  const totalItemsCount = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const totalValuation = inventory.reduce((sum, item) => {
    const prod = PRODUCT_MAP[item.productId];
    return sum + (prod ? prod.purchasePrice * item.quantity : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      {/* Stardew Valley Carved Wood Window */}
      <div className="bg-[#fcf4dc] border-4 border-[#7a4b26] ring-4 ring-[#402611] rounded-xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden text-[#3d2716]">
        {/* Header Bar */}
        <div className="bg-[#7a4b26] px-4 py-2.5 border-b-4 border-[#593215] flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h2 className="text-sm sm:text-base font-bold text-[#ffeaa7] tracking-wide font-mono">
              SỔ QUẢN LÍ HÀNG HÓA & KHO
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

        {/* Valuation & Summary Ribbon */}
        <div className="bg-[#ebdcc3] px-4 py-2 border-b-2 border-[#cbb694] flex justify-between items-center text-xs font-mono shrink-0">
          <div>
            <span className="text-[#6d5138]">Hàng trong túi: </span>
            <span className="font-extrabold text-[#7a4b26]">{totalItemsCount} món</span>
          </div>
          <div>
            <span className="text-[#6d5138]">Tổng vốn tồn kho: </span>
            <span className="font-extrabold text-[#2a6f44]">
              {totalValuation.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Items Grid / List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 bg-[#fcf4dc]">
          {inventory.length === 0 ? (
            <div className="text-center py-12 text-[#91765e] italic font-medium">
              Túi đồ hiện đang trống. Hãy nhấn "Nhập hàng" từ đại lý để lấy thêm hàng nhé!
            </div>
          ) : (
            inventory.map((item) => {
              const prod = PRODUCT_MAP[item.productId];
              if (!prod) return null;

              const profitPerItem = prod.baseSellingPrice - prod.purchasePrice;

              return (
                <div
                  key={item.productId}
                  className="bg-[#f5ecce] border-2 border-[#c9ab7a] hover:border-[#7a4b26] rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Inset Slot */}
                    <div className="w-12 h-12 bg-[#ebdcc3] border-2 border-[#a68453] rounded-md flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      🛍️
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-[#3d2716]">
                          {prod.name}
                        </h4>
                        <span className="bg-[#ebdcc3] border border-[#b89b72] text-[10px] text-[#634932] px-1.5 py-0.2 rounded font-mono">
                          {PRODUCT_CATEGORY_LABELS[prod.category]}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#735841] mt-0.5 line-clamp-1 italic">
                        {prod.description}
                      </div>
                      {item.lots?.[0] && <div className="text-[11px] text-[#a62b2b] mt-0.5 font-bold">Lô gần hạn: ngày {item.lots[0].expiresOnDay} ({Math.max(0, item.lots[0].expiresOnDay - currentDay)} ngày nữa){prod.storageType === 'cold' ? ' · Kho mát' : ''}</div>}
                      <div className="text-[11px] text-[#4d3420] mt-1 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Vốn: <b>{prod.purchasePrice.toLocaleString('vi-VN')} đ</b></span>
                        <span>Bán: <b className="text-[#a62b2b]">{prod.baseSellingPrice.toLocaleString('vi-VN')} đ</b></span>
                        <span className="text-[#2a6f44] font-semibold">(Lãi: +{profitPerItem.toLocaleString('vi-VN')} đ)</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Badge */}
                  <div className="bg-[#ebdcc3] border border-[#a68453] px-3 py-1.5 rounded-md text-center shrink-0 shadow-inner">
                    <div className="text-[9px] uppercase tracking-wider text-[#735841] font-bold">SL</div>
                    <div className="text-base font-extrabold text-[#7a4b26] font-mono leading-none">
                      x{item.quantity}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#ebdcc3] px-4 py-2.5 border-t-2 border-[#cbb694] flex justify-between items-center shrink-0">
          <div className="text-[11px] text-[#735841] italic">
            💡 Mẹo: Bày hàng đầy đủ các kệ để tiệm luôn đông khách!
          </div>
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
