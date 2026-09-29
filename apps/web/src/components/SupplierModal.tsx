import React, { useState } from 'react';
import { ALL_PRODUCTS, PRODUCT_CATEGORY_LABELS, PRODUCT_MAP } from '@game/data';
import { COLD_WAREHOUSE_CAPACITY, InventoryItem, PlayerData, ProductCategory, SupplierOrder } from '@game/shared';

interface SupplierModalProps {
  player: PlayerData;
  pendingOrders: SupplierOrder[];
  inventory: InventoryItem[];
  onOrder: (productId: string, quantity: number) => void;
  onClose: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ player, pendingOrders, inventory, onOrder, onClose }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const coldUsed = inventory.reduce((total, item) => total + (PRODUCT_MAP[item.productId]?.storageType === 'cold' ? item.quantity : 0), 0);
  const coldReserved = pendingOrders.reduce((total, order) => total + (PRODUCT_MAP[order.productId]?.storageType === 'cold' ? order.quantity : 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[#fcf4dc] border-4 border-[#7a4b26] ring-4 ring-[#402611] rounded-xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden text-[#3d2716]">
        {/* Header */}
        <div className="bg-[#7a4b26] px-4 py-2.5 border-b-4 border-[#593215] flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚚</span>
            <h2 className="text-sm sm:text-base font-bold text-[#ffeaa7] tracking-wide font-mono">
              ĐẠI LÝ PHÂN PHỐI HÀNG HÓA ĐẦU HẺM
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

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 bg-[#fcf4dc]">
          <div className="bg-[#ebdcc3] p-2.5 rounded-lg border-2 border-[#caa472] flex justify-between items-center text-xs font-mono">
            <span>Tiền vốn hiện có:</span>
            <span className="font-extrabold text-[#7a4b26] text-sm">
              {player.money.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="text-xs font-mono text-[#735841]">Kho mát: {coldUsed + coldReserved}/{COLD_WAREHOUSE_CAPACITY} chỗ (gồm đơn đang giao)</div>
          <label className="block text-xs font-bold text-[#634932]">Nhóm hàng
            <select value={category} onChange={(event) => setCategory(event.target.value as ProductCategory | 'all')}
              className="ml-2 bg-[#ebdcc3] text-[#3d2716] border-2 border-[#caa472] rounded px-2 py-1">
              <option value="all">Tất cả</option>
              {Object.entries(PRODUCT_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>

          <div className="space-y-2">
            {ALL_PRODUCTS.filter((product) => product.unlockLevel <= player.level && (category === 'all' || product.category === category)).map((product) => {
              const quantity = quantities[product.id] ?? 1;
              const cost = quantity * product.purchasePrice;
              const coldFull = product.storageType === 'cold' && coldUsed + coldReserved + quantity > COLD_WAREHOUSE_CAPACITY;
              return (
                <div
                  key={product.id}
                  className="bg-[#f5ecce] border-2 border-[#caa472] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs"
                >
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#3d2716]">{product.name}</div>
                    <div className="text-[10px] text-[#735841]">{PRODUCT_CATEGORY_LABELS[product.category]}{product.storageType === 'cold' ? ' · Giữ mát' : ''}</div>
                    <div className="text-[11px] text-[#735841] font-mono mt-0.5">
                      Vốn sỉ: {product.purchasePrice.toLocaleString('vi-VN')} đ/cái · Tổng: <b className="text-[#a62b2b]">{cost.toLocaleString('vi-VN')} đ</b>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <label className="text-xs text-[#634932]" htmlFor={`qty-${product.id}`}>SL</label>
                    <input
                      id={`qty-${product.id}`}
                      type="number"
                      min="1"
                      max="99"
                      value={quantity}
                      onChange={(event) => setQuantities((old) => ({ ...old, [product.id]: Number(event.target.value) }))}
                      className="w-14 bg-[#ebdcc3] text-[#3d2716] border-2 border-[#caa472] rounded px-2 py-0.5 text-xs text-center font-bold"
                    />
                    <button
                      disabled={!Number.isSafeInteger(quantity) || quantity < 1 || cost > player.money || coldFull}
                      onClick={() => onOrder(product.id, quantity)}
                      className="bg-[#2a6f44] hover:bg-[#1e5232] disabled:opacity-40 text-white font-bold px-3 py-1 rounded text-xs shadow-xs active:translate-y-0.5"
                    >
                      Đặt hàng
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending Orders */}
          <div className="pt-2">
            <h3 className="font-bold text-xs font-mono text-[#7a4b26] mb-1.5">
              Đơn hàng xe máy đang giao ({pendingOrders.length})
            </h3>
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-[#91765e] italic bg-[#ebdcc3] p-2 rounded border border-[#caa472]">
                Chưa có đơn hàng nào đang trên đường vận chuyển.
              </p>
            ) : (
              <div className="space-y-1">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="text-xs bg-[#ebdcc3] rounded p-2 border border-[#caa472] font-mono flex justify-between">
                    <span>📦 {PRODUCT_MAP[order.productId]?.name ?? order.productId} × {order.quantity}</span>
                    <span className="text-[#7a4b26] font-bold">Giao Ngày {order.arrivalDay}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#ebdcc3] px-4 py-2 border-t-2 border-[#cbb694] flex justify-end shrink-0">
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
