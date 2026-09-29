import React from 'react';
import { StoreFixture, InventoryItem } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

interface ShelfModalProps {
  fixture: StoreFixture;
  inventory: InventoryItem[];
  currentDay: number;
  onRestock: (fixtureId: string, productId: string, amount: number) => void;
  onUnstock: (fixtureId: string, amount: number) => void;
  onClose: () => void;
}

export const ShelfModal: React.FC<ShelfModalProps> = ({
  fixture,
  inventory,
  currentDay,
  onRestock,
  onUnstock,
  onClose,
}) => {
  const currentProduct = fixture.assignedProductId
    ? PRODUCT_MAP[fixture.assignedProductId]
    : null;

  const productLimit = currentProduct ? Math.min(fixture.maxCapacity, currentProduct.shelfCapacity) : fixture.maxCapacity;
  const stockPercentage = Math.round((fixture.currentStock / productLimit) * 100);

  // In-inventory quantity of current product
  const inventoryItem = currentProduct
    ? inventory.find((i) => i.productId === currentProduct.id)
    : null;
  const inInventoryCount = inventoryItem?.quantity || 0;
  const compatibleInventory = inventory.filter((item) => {
    const product = PRODUCT_MAP[item.productId];
    return product && (fixture.type === 'refrigerator' ? product.storageType === 'cold' : product.storageType === 'ambient');
  });
  const earliestExpiry = fixture.stockLots?.[0]?.expiresOnDay;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[#fcf4dc] border-4 border-[#7a4b26] ring-4 ring-[#402611] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-[#3d2716]">
        {/* Modal Header */}
        <div className="bg-[#7a4b26] px-4 py-2.5 border-b-4 border-[#593215] flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">{fixture.type === 'refrigerator' ? '🧊' : '🪵'}</span>
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
          {/* Capacity Progress Bar with Stardew Inset */}
          <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] shadow-xs">
            <div className="flex justify-between items-center text-xs mb-1.5 font-bold font-mono">
              <span className="text-[#7a4b26]">Sức chứa kệ hàng:</span>
              <span className="text-[#3d2716]">
                {fixture.currentStock} / {productLimit} ({stockPercentage}%)
              </span>
            </div>
            <div className="w-full bg-[#ebdcc3] h-3.5 rounded-full overflow-hidden border-2 border-[#a68453] shadow-inner">
              <div
                className={`h-full transition-all duration-300 ${
                  stockPercentage >= 80
                    ? 'bg-[#2a6f44]'
                    : stockPercentage >= 40
                    ? 'bg-[#e07a5f]'
                    : 'bg-[#a62b2b]'
                }`}
                style={{ width: `${stockPercentage}%` }}
              />
            </div>
          </div>

          {currentProduct ? (
            /* Currently Assigned Product Card */
            <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 bg-[#ebdcc3] rounded-lg border-2 border-[#a68453] flex items-center justify-center text-3xl shrink-0 shadow-inner">
                  🛍️
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm sm:text-base text-[#3d2716]">
                    {currentProduct.name}
                  </h3>
                  <div className="text-xs text-[#634932] mt-0.5 font-mono">
                    Bán: <b className="text-[#a62b2b]">{currentProduct.baseSellingPrice.toLocaleString('vi-VN')} đ</b> | Vốn: {currentProduct.purchasePrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[11px] text-[#735841] mt-1 italic leading-tight">
                    {currentProduct.description}
                  </div>
                  {earliestExpiry !== undefined && <div className="text-[11px] text-[#a62b2b] font-bold mt-1">Lô gần hạn nhất: ngày {earliestExpiry} ({Math.max(0, earliestExpiry - currentDay)} ngày nữa)</div>}
                </div>
              </div>

              {/* Stock in inventory */}
              <div className="text-xs bg-[#ebdcc3] p-2 rounded border border-[#caa472] flex justify-between font-mono font-medium">
                <span>Còn trong túi hàng:</span>
                <span className="font-bold text-[#7a4b26]">{inInventoryCount} cái</span>
              </div>

              {/* Restock & Unstock Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <button
                  disabled={inInventoryCount <= 0 || fixture.currentStock >= productLimit}
                  onClick={() => onRestock(fixture.id, currentProduct.id, 1)}
                  className="bg-[#2a6f44] hover:bg-[#1e5232] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#ffeaa7]/40 text-xs shadow transition-all active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  ➕ Bày thêm (+1)
                </button>

                <button
                  disabled={inInventoryCount <= 0 || fixture.currentStock >= productLimit}
                  onClick={() =>
                    onRestock(
                      fixture.id,
                      currentProduct.id,
                      Math.min(inInventoryCount, productLimit - fixture.currentStock)
                    )
                  }
                  className="bg-[#3d7068] hover:bg-[#2b524c] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#ffeaa7]/40 text-xs shadow transition-all active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  ⚡ Bày đầy kệ
                </button>

                <button
                  disabled={fixture.currentStock <= 0}
                  onClick={() => onUnstock(fixture.id, 1)}
                  className="bg-[#9c6a38] hover:bg-[#7a5026] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#ffeaa7]/40 text-xs shadow transition-all active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  ➖ Cất lại (-1)
                </button>

                <button
                  disabled={fixture.currentStock <= 0}
                  onClick={() => onUnstock(fixture.id, fixture.currentStock)}
                  className="bg-[#a62b2b] hover:bg-[#852222] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2 px-3 rounded-lg border border-[#ffeaa7]/40 text-xs shadow transition-all active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  🗑️ Cất hết vào túi
                </button>
              </div>
            </div>
          ) : (
            /* Empty Shelf: Choose item from inventory */
            <div className="space-y-2">
              <div className="text-xs text-[#634932] font-medium">
                {fixture.type === 'refrigerator' ? 'Tủ mát chỉ nhận hàng cần giữ lạnh:' : 'Kệ hàng đang trống. Hãy chọn một mặt hàng trong túi đồ để bày lên kệ:'}
              </div>

              {compatibleInventory.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#91765e] italic bg-[#ebdcc3] rounded-lg border border-[#caa472]">
                  Chưa có hàng phù hợp trong kho.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {compatibleInventory.map((item) => {
                    const prod = PRODUCT_MAP[item.productId];
                    if (!prod) return null;

                    return (
                      <div
                        key={item.productId}
                        className="bg-[#f5ecce] p-2.5 rounded-lg border-2 border-[#caa472] flex items-center justify-between gap-2 hover:border-[#7a4b26] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">📦</span>
                          <div>
                            <div className="font-bold text-xs text-[#3d2716]">{prod.name}</div>
                            <div className="text-[11px] text-[#634932] font-mono">
                              Có: {item.quantity} | Giá bán: {prod.baseSellingPrice.toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onRestock(fixture.id, prod.id, Math.min(item.quantity, fixture.maxCapacity, prod.shelfCapacity))}
                          className="bg-[#2a6f44] hover:bg-[#1e5232] active:translate-y-0.5 text-white text-xs font-bold font-mono px-3 py-1.5 rounded border border-[#ffeaa7]/50 shadow transition-all"
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
