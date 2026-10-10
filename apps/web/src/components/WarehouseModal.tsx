import React, {useState, useMemo} from 'react';
import {InventoryItem,StoreFixture,SupplierOrder,HoldingItem,COLD_WAREHOUSE_CAPACITY,isSalesFixture} from '@game/shared';
import {PRODUCT_MAP, effectiveShelfCapacity} from '@game/data';
import {PixelDialog,PixelButton,PixelStat,PixelProgress,ProductSlot,EmptyState} from './pixel';

interface Props {
  capacityBonus?: number;
  coldCapacity?: number;
  ambientCapacity?: number;
  ambientUsed?: number;
  fixture: StoreFixture;
  inventory: InventoryItem[];
  holdingArea?: HoldingItem[];
  fixtures: StoreFixture[];
  pendingOrders: SupplierOrder[];
  currentDay: number;
  onRestock: () => void;
  onStowHolding?: (id?: string) => void;
  onDisposeStock?: (productId: string, quantity: number) => void;
  onOpenCase?: (productId: string, count: number) => void;
  onOpenSupplier?: () => void;
  onClose: () => void;
}

export const WarehouseModal: React.FC<Props> = ({
  fixture,
  inventory,
  fixtures,
  pendingOrders,
  currentDay,
  onRestock,
  onClose,
  onDisposeStock,
  onOpenCase,
  onOpenSupplier,
  capacityBonus = 0,
  coldCapacity = COLD_WAREHOUSE_CAPACITY,
  ambientCapacity,
  ambientUsed = 0,
}) => {
  const [group, setGroup] = useState<'all' | 'ambient' | 'cold'>(
    fixture.type === 'warehouse_cold' ? 'cold' : fixture.type === 'warehouse_dry' ? 'ambient' : 'all'
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  const items = inventory.filter(i => i.quantity > 0);
  const cold = items.reduce((n, i) => n + (PRODUCT_MAP[i.productId]?.storageType === 'cold' ? i.quantity : 0), 0);
  const reserved = pendingOrders.reduce((n, o) => n + (PRODUCT_MAP[o.productId]?.storageType === 'cold' ? o.quantity : 0), 0);
  const canRestock = fixtures.some(
    f => isSalesFixture(f) && f.assignedProductId && f.currentStock < effectiveShelfCapacity(f.maxCapacity, PRODUCT_MAP[f.assignedProductId]?.shelfCapacity ?? f.maxCapacity, capacityBonus) && items.some(i => i.productId === f.assignedProductId)
  );

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter(i => {
      const prod = PRODUCT_MAP[i.productId];
      const matchGroup = group === 'all' || prod?.storageType === group;
      const matchSearch = !q || (prod?.name.toLowerCase().includes(q) ?? false) || i.productId.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [items, group, searchTerm]);

  return (
    <PixelDialog
      title="Nhà kho sau tiệm"
      subtitle="Nhận hàng · Kiểm kê · Chuẩn bị lên kệ"
      icon="warehouse"
      onClose={onClose}
      footer={
        <div className="warehouse-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <PixelButton icon="plus" variant="teal" disabled={!canRestock} onClick={onRestock}>Bày hàng lên kệ</PixelButton>
          <PixelButton icon="truck" onClick={onOpenSupplier}>Ghé đại lý nhập hàng</PixelButton>
        </div>
      }
    >
      <div className="summary-row warehouse-summary">
        <PixelStat label="Hàng dự trữ" value={`${items.reduce((n, i) => n + i.quantity, 0)} món`} icon="warehouse" />
        <div>
          <strong>Kho mát {cold}/{coldCapacity}</strong>
          <p className="muted">Đơn chờ giữ {reserved} chỗ · Còn {Math.max(0, coldCapacity - cold - reserved)} chỗ</p>
          {ambientCapacity !== undefined && <p className="warehouse-ambient">Kho thường {ambientUsed}/{ambientCapacity} ô</p>}
        </div>
      </div>
      <div className="warehouse-capacity">
        {ambientCapacity !== undefined && <PixelProgress label={`Kho thường ${ambientUsed}/${ambientCapacity} ô`} value={ambientUsed} max={ambientCapacity} />}
        <PixelProgress label="Chỗ kho mát đã dùng và giữ" value={cold + reserved} max={coldCapacity} />
      </div>
      <p className="muted warehouse-hint" style={{ margin: '8px 0 12px' }}>Hàng dự trữ dùng chung với sổ kho. Bày lên kệ lấy hàng từ đây; cất khỏi kệ trả hàng về kho.</p>

      <div className="warehouse-filter-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <label className="form-filter" style={{ flex: '1 1 200px', margin: 0 }}>
          <span className="form-filter-label">Tìm kiếm</span>
          <input
            type="search"
            aria-label="Tìm kiếm"
            placeholder="Tìm theo tên hoặc mã..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ minHeight: '44px', width: '100%', background: 'var(--color-panel)', border: '2px solid var(--color-outline)', padding: '8px', color: 'var(--color-text)' }}
          />
        </label>
        <label className="form-filter" style={{ flex: '1 1 200px', margin: 0 }}>
          <span className="form-filter-label">Khu bảo quản</span>
          <select aria-label="Khu bảo quản" value={group} onChange={e => setGroup(e.target.value as typeof group)} style={{ width: '100%' }}>
            <option value="all">Toàn bộ nhà kho</option>
            <option value="ambient">Giá hàng khô</option>
            <option value="cold">Góc bảo quản lạnh</option>
          </select>
        </label>
      </div>

      {filteredItems.map(i => {
        const product = PRODUCT_MAP[i.productId];
        const totalCases = i.lots?.reduce((sum, l) => sum + (l.caseCount ?? 0), 0) ?? 0;
        return (
          <div className="product-row" key={i.productId}>
            <ProductSlot productId={i.productId} />
            <div className="product-info">
              <h3>{product?.name ?? i.productId}</h3>
              <p>{product?.storageType === 'cold' ? 'Giữ lạnh' : 'Hàng khô'} · {i.quantity} món</p>
              <details className="warehouse-more" open={typeof document === 'undefined' || document.documentElement.dataset.density !== 'compact'}>
                <summary>Lô, thùng và thao tác</summary>
              <div className="warehouse-lots">
                {totalCases > 0 && product?.caseSize && (
                  <p style={{ color: 'var(--color-green-dark)', fontWeight: 'bold' }}>📦 {totalCases} thùng ({totalCases * product.caseSize} lẻ)</p>
                )}
                {i.lots?.map(l => (
                  <p key={l.expiresOnDay}>Lô {l.quantity} món · Hạn ngày {l.expiresOnDay} · còn {Math.max(0, l.expiresOnDay - currentDay)} ngày{l.caseCount ? ` · ${l.caseCount} thùng` : ''}</p>
                ))}
              </div>
              {totalCases > 0 && onDisposeStock && onOpenCase && (
                <div className="warehouse-item-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <PixelButton variant="teal" onClick={() => {
                    if (window.confirm(`Mở 1 thùng ${product?.name}? Thùng sẽ thành ${product.caseSize} lẻ.`)) {
                      onOpenCase(i.productId, 1);
                    }
                  }}>📦 Mở 1 thùng</PixelButton>
                  <PixelButton variant="teal" onClick={() => {
                    if (window.confirm(`Mở tất cả ${totalCases} thùng ${product?.name}?`)) {
                      onOpenCase(i.productId, totalCases);
                    }
                  }}>📦 Mở hết thùng</PixelButton>
                </div>
              )}
              {onDisposeStock && (
                <PixelButton icon="warning" variant="brick" onClick={() => {
                  const name = PRODUCT_MAP[i.productId]?.name ?? i.productId;
                  if (window.confirm(`Tiêu hủy toàn bộ ${i.quantity} ${name} trong kho? Hàng gần hạn bị hủy trước và ghi vào sổ cái như một khoản lỗ.`)) onDisposeStock(i.productId, i.quantity);
                }}>Tiêu hủy hàng</PixelButton>
              )}
              </details>
            </div>
          </div>
        );
      })}
      {filteredItems.length === 0 && (
        <EmptyState title="Không có hàng phù hợp">
          {items.length === 0 ? 'Ghé đại lý để chuẩn bị hàng cho ngày bán mới.' : 'Không tìm thấy mặt hàng khớp với bộ lọc.'}
        </EmptyState>
      )}

      <section className="pending-orders">
        <h3>Khu nhận hàng · {pendingOrders.length} đơn đang giao</h3>
        <p className="muted">Đơn đến hạn tự nhập kho khi qua ngày mới. Không cần nhận thêm lần nữa.</p>
        {pendingOrders.length ? pendingOrders.map(o => (
          <div className="pending-item" key={o.id}>
            <strong>{PRODUCT_MAP[o.productId]?.name ?? o.productId} × {o.quantity}</strong>
            <span>Giao ngày {o.arrivalDay}</span>
          </div>
        )) : <p className="muted">Chưa có đơn đang giao.</p>}
      </section>

      {!canRestock && <p className="action-reason" style={{ marginTop: '12px' }}>Chưa có kệ thiếu hàng phù hợp để bày từ kho. Chọn hàng tại kệ trống để bày món mới.</p>}
    </PixelDialog>
  );
};
