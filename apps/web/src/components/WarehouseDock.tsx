import React from 'react';
import { InventoryItem, StoreFixture, HoldingItem, COLD_WAREHOUSE_CAPACITY, isSalesFixture } from '@game/shared';
import { PRODUCT_MAP, effectiveShelfCapacity } from '@game/data';
import { PixelButton, PixelIcon, ProductSlot, EmptyState } from './pixel';

interface Props {
  capacityBonus?: number;
  coldCapacity?: number;
  ambientCapacity?: number;
  ambientUsed?: number;
  inventory: InventoryItem[];
  holdingArea?: HoldingItem[];
  fixtures: StoreFixture[];
  isOpen: boolean;
  onToggle: () => void;
  onAutoRestock: () => void;
  onOpenSupplier: () => void;
  onOpenPlanogram?: () => void;
  onLocateWarehouse: () => void;
  onStowHolding?: (id?: string) => void;
  currentDay: number;
}

export const WarehouseDock: React.FC<Props> = ({
  inventory,
  holdingArea = [],
  fixtures,
  isOpen,
  onToggle,
  onAutoRestock,
  onOpenSupplier,
  onOpenPlanogram,
  onLocateWarehouse,
  onStowHolding,
  currentDay,
  capacityBonus = 0,
  coldCapacity = COLD_WAREHOUSE_CAPACITY,
  ambientCapacity,
  ambientUsed = 0,
}) => {
  if (!isOpen) return null;
  const items = inventory.filter((i) => i.quantity > 0);
  const cold = items.reduce((n, i) => n + (PRODUCT_MAP[i.productId]?.storageType === 'cold' ? i.quantity : 0), 0);
  const restockable = fixtures.filter(
    (f) =>
      isSalesFixture(f) &&
      f.assignedProductId &&
      f.currentStock < effectiveShelfCapacity(f.maxCapacity, PRODUCT_MAP[f.assignedProductId]?.shelfCapacity ?? f.maxCapacity, capacityBonus) &&
      items.some((i) => i.productId === f.assignedProductId && i.quantity > 0)
  );
  const empty = fixtures.filter((f) => isSalesFixture(f) && f.currentStock === 0).length;
  const totalHolding = holdingArea.reduce((sum, h) => sum + h.quantity, 0);

  return (
    <aside className="warehouse-dock" aria-label="Kho hàng">
      <header className="dock-heading">
        <div className="dock-title">
          <div>
            <PixelIcon name="warehouse" />
            <h2>Kho sau tiệm</h2>
          </div>
          <PixelButton icon="close" aria-label="Thu gọn kho" onClick={onToggle} />
        </div>
        <div className="dock-meta">
          <span>{items.reduce((n, i) => n + i.quantity, 0)} món hàng</span>
          {ambientCapacity !== undefined && <span>Thường {ambientUsed}/{ambientCapacity} ô</span>}
          <span>Mát {cold}/{coldCapacity}</span>
        </div>
      </header>

      {totalHolding > 0 && (
        <div style={{ padding: '8px 12px', background: '#FFF0D4', borderBottom: '2px solid #D5B98E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '12px', color: '#88392F' }}>Hàng chờ cất: {totalHolding} món</strong>
            {onStowHolding && (
              <PixelButton
                variant="teal"
                style={{ minHeight: '28px', padding: '4px 8px', fontSize: '12px' }}
                onClick={() => onStowHolding()}
              >
                Cất vào kho
              </PixelButton>
            )}
          </div>
          <div style={{ maxHeight: '80px', overflowY: 'auto', marginTop: '4px', fontSize: '11px' }}>
            {holdingArea.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>{PRODUCT_MAP[h.productId]?.name ?? h.productId}</span>
                <strong>× {h.quantity}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dock-list">
        {items.length ? (
          items.map((item) => (
            <div key={item.productId} className="dock-product">
              <ProductSlot productId={item.productId} />
              <div>
                <strong>{PRODUCT_MAP[item.productId]?.name ?? item.productId}</strong>
                <p>
                  {item.lots?.[0]
                    ? `Hạn: còn ${Math.max(0, item.lots[0].expiresOnDay - currentDay)} ngày`
                    : 'Hàng trong kho'}
                </p>
              </div>
              <span className="dock-count">{item.quantity}</span>
            </div>
          ))
        ) : (
          <EmptyState title="Kho đang trống">Đặt hàng từ đại lý để chuẩn bị ngày bán mới.</EmptyState>
        )}
      </div>

      <footer className="dock-actions">
        <PixelButton icon="warehouse" onClick={onLocateWarehouse}>
          Xem nhà kho
        </PixelButton>
        {onOpenPlanogram && (
          <PixelButton icon="warehouse" onClick={onOpenPlanogram} title="Xem toàn bộ các kệ và châm hàng">
            Sơ đồ kệ
          </PixelButton>
        )}
        <p>
          {empty > 0 ? `${empty} kệ đang trống. ` : ''}
          {restockable.length ? `${restockable.length} kệ có thể châm từ kho.` : 'Chưa có hàng phù hợp để châm các kệ.'}
          {cold >= coldCapacity ? ' Kho mát đã đầy.' : ''}
        </p>
        <PixelButton icon="plus" variant="teal" onClick={onAutoRestock} disabled={!restockable.length}>
          Châm các kệ
        </PixelButton>
        <PixelButton icon="truck" onClick={onOpenSupplier}>
          Ghé đại lý
        </PixelButton>
      </footer>
    </aside>
  );
};

