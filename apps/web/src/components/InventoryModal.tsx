import React from 'react';
import { InventoryItem } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

interface InventoryModalProps {
  inventory: InventoryItem[];
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ inventory, onClose }) => {
  const totalItemsCount = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const totalValuation = inventory.reduce((sum, item) => {
    const prod = PRODUCT_MAP[item.productId];
    return sum + (prod ? prod.purchasePrice * item.quantity : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#2b1e16] border-4 border-[#d4a373] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-[#f4ecd8]">
        {/* Modal Header */}
        <div className="bg-[#583101] px-4 py-3 border-b-2 border-[#d4a373] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 className="text-base sm:text-lg font-bold text-[#ffd166] tracking-wide">
              Túi Hàng & Kho Mini (Sổ Quản Lý)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#ffd166] hover:text-white text-lg font-bold px-2 py-0.5 rounded bg-[#8b5a2b] hover:bg-[#a06535] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Valuation Summary */}
        <div className="bg-[#1b1c1e] px-4 py-2.5 border-b border-[#d4a373]/30 flex justify-between items-center text-xs shrink-0">
          <div>
            <span className="text-[#faedcd]/70">Tổng số lượng tồn: </span>
            <span className="font-bold text-[#ffd166]">{totalItemsCount} món</span>
          </div>
          <div>
            <span className="text-[#faedcd]/70">Giá trị vốn hàng: </span>
            <span className="font-mono font-bold text-[#2a9d8f]">
              {totalValuation.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {inventory.length === 0 ? (
            <div className="text-center py-12 text-[#faedcd]/60 italic">
              Túi hàng đang trống. Bạn có thể nhập thêm hàng từ đại lý hoặc lấy lại từ kệ trưng bày!
            </div>
          ) : (
            inventory.map((item) => {
              const prod = PRODUCT_MAP[item.productId];
              if (!prod) return null;

              const profitPerItem = prod.baseSellingPrice - prod.purchasePrice;

              return (
                <div
                  key={item.productId}
                  className="bg-[#38271e] p-3 rounded-lg border border-[#d4a373]/50 hover:border-[#ffd166] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-[#1b1c1e] rounded-lg border-2 border-[#ffd166] flex items-center justify-center text-xl shrink-0 shadow-inner">
                      🛍️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#ffd166]">{prod.name}</h4>
                        <span className="bg-[#583101] text-[10px] text-[#faedcd] px-1.5 py-0.5 rounded border border-[#d4a373]/40">
                          {prod.category}
                        </span>
                      </div>
                      <div className="text-xs text-[#faedcd]/70 mt-1 line-clamp-1">
                        {prod.description}
                      </div>
                      <div className="text-xs text-[#faedcd]/80 mt-1 flex gap-3">
                        <span>Giá nhập: <b>{prod.purchasePrice.toLocaleString('vi-VN')} đ</b></span>
                        <span>Giá bán: <b className="text-[#ffd166]">{prod.baseSellingPrice.toLocaleString('vi-VN')} đ</b></span>
                        <span className="text-[#2a9d8f]">(Lãi: +{profitPerItem.toLocaleString('vi-VN')} đ)</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 bg-[#241711] sm:bg-transparent p-2 sm:p-0 rounded border sm:border-0 border-[#583101]">
                    <div className="text-[11px] text-[#faedcd]/70">Số lượng có sẵn:</div>
                    <div className="text-lg font-mono font-bold text-[#ffd166]">
                      x{item.quantity}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#1e140f] px-4 py-3 border-t border-[#d4a373]/30 flex justify-end shrink-0">
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
