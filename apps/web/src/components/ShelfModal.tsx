import React from 'react';
import { StoreFixture, InventoryItem } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { useGameStore } from '../store/useGameStore';

interface ShelfModalProps {
  fixture: StoreFixture;
  inventory: InventoryItem[];
  onRestock: (fixtureId: string, productId: string, amount: number) => void;
  onUnstock: (fixtureId: string, amount: number) => void;
  onClose: () => void;
}

export const ShelfModal: React.FC<ShelfModalProps> = ({
  fixture,
  inventory,
  onRestock,
  onUnstock,
  onClose,
}) => {
  const currentProduct = fixture.assignedProductId
    ? PRODUCT_MAP[fixture.assignedProductId]
    : null;

  const stockPercentage = Math.round((fixture.currentStock / fixture.maxCapacity) * 100);

  // In-inventory quantity of current product
  const inventoryItem = currentProduct
    ? inventory.find((i) => i.productId === currentProduct.id)
    : null;
  const inInventoryCount = inventoryItem?.quantity || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#2b1e16] border-4 border-[#d4a373] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-[#f4ecd8]">
        {/* Modal Header */}
        <div className="bg-[#583101] px-4 py-3 border-b-2 border-[#d4a373] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪵</span>
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
          {/* Capacity Progress */}
          <div className="bg-[#1b1c1e] p-3 rounded-lg border border-[#d4a373]/40">
            <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
              <span className="text-[#ffd166]">Sức chứa kệ:</span>
              <span className="font-mono text-sm">
                {fixture.currentStock} / {fixture.maxCapacity} món ({stockPercentage}%)
              </span>
            </div>
            <div className="w-full bg-[#343a40] h-3 rounded-full overflow-hidden border border-[#5c3818]">
              <div
                className={`h-full transition-all duration-300 ${
                  stockPercentage >= 90
                    ? 'bg-[#2a9d8f]'
                    : stockPercentage >= 40
                    ? 'bg-[#e76f51]'
                    : 'bg-[#e63946]'
                }`}
                style={{ width: `${stockPercentage}%` }}
              />
            </div>
          </div>

          {currentProduct ? (
            /* Currently Assigned Product Card */
            <div className="bg-[#38271e] p-3 rounded-lg border border-[#d4a373]/60 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 bg-[#1b1c1e] rounded-lg border-2 border-[#ffd166] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  🛍️
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base text-[#ffd166]">
                    {currentProduct.name}
                  </h3>
                  <div className="text-xs text-[#faedcd]/80 mt-0.5">
                    Giá bán: <span className="font-bold text-[#ffd166]">{currentProduct.baseSellingPrice.toLocaleString('vi-VN')} đ</span> | Vốn: {currentProduct.purchasePrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#d4a373] mt-1 italic">
                    {currentProduct.description}
                  </div>
                </div>
              </div>

              {/* Stock in inventory */}
              <div className="text-xs bg-[#241711] p-2 rounded border border-[#583101] flex justify-between">
                <span>Còn trong túi hàng:</span>
                <span className="font-bold text-[#ffd166]">{inInventoryCount} cái</span>
              </div>

              {/* Restock & Unstock Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={inInventoryCount <= 0 || fixture.currentStock >= fixture.maxCapacity}
                  onClick={() => onRestock(fixture.id, currentProduct.id, 1)}
                  className="bg-[#2d6a4f] hover:bg-[#1b4332] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#52b788] text-xs transition-all flex items-center justify-center gap-1"
                >
                  ➕ Bày thêm (+1)
                </button>

                <button
                  disabled={inInventoryCount <= 0 || fixture.currentStock >= fixture.maxCapacity}
                  onClick={() =>
                    onRestock(
                      fixture.id,
                      currentProduct.id,
                      Math.min(inInventoryCount, fixture.maxCapacity - fixture.currentStock)
                    )
                  }
                  className="bg-[#2a9d8f] hover:bg-[#21867a] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#52b788] text-xs transition-all flex items-center justify-center gap-1"
                >
                  ⚡ Bày đầy kệ
                </button>

                <button
                  disabled={fixture.currentStock <= 0}
                  onClick={() => onUnstock(fixture.id, 1)}
                  className="bg-[#8b5a2b] hover:bg-[#a06535] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#d4a373] text-xs transition-all flex items-center justify-center gap-1"
                >
                  ➖ Cất lại (-1)
                </button>

                <button
                  disabled={fixture.currentStock <= 0}
                  onClick={() => onUnstock(fixture.id, fixture.currentStock)}
                  className="bg-[#9e2a2b] hover:bg-[#782021] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#e63946] text-xs transition-all flex items-center justify-center gap-1"
                >
                  🗑️ Cất hết vào túi
                </button>
              </div>
            </div>
          ) : (
            /* Empty Shelf: Choose item from inventory */
            <div className="space-y-2">
              <div className="text-xs text-[#faedcd]/80 font-medium">
                Kệ hàng đang trống. Hãy chọn một mặt hàng trong túi đồ để bày lên kệ:
              </div>

              {inventory.length === 0 ? (
                <div className="text-center py-6 text-sm text-[#faedcd]/60 italic bg-[#1b1c1e] rounded-lg">
                  Túi đồ của bạn hiện đang trống hàng!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {inventory.map((item) => {
                    const prod = PRODUCT_MAP[item.productId];
                    if (!prod) return null;

                    return (
                      <div
                        key={item.productId}
                        className="bg-[#38271e] p-2.5 rounded-lg border border-[#d4a373]/40 flex items-center justify-between gap-2 hover:border-[#ffd166] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">📦</span>
                          <div>
                            <div className="font-bold text-xs text-[#ffd166]">{prod.name}</div>
                            <div className="text-[11px] text-[#faedcd]/70">
                              Có: {item.quantity} | Giá bán: {prod.baseSellingPrice.toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onRestock(fixture.id, prod.id, Math.min(item.quantity, fixture.maxCapacity))}
                          className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white text-xs font-bold px-3 py-1.5 rounded border border-[#52b788] transition-colors"
                        >
                          Bày lên kệ
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
