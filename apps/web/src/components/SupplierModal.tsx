import React, { useState, useMemo } from 'react';
import {
  PlayerData,
  InventoryItem,
  SupplierOrder,
  ProductCategory,
  COLD_WAREHOUSE_CAPACITY,
  SupplierCartItem,
  RestockSuggestionResult,
  SuggestedCartItem,
  AutoBuyRule,
  AutoBuyReport,
} from '@game/shared';
import { ALL_PRODUCTS, PRODUCT_MAP, PRODUCT_CATEGORY_LABELS, SUPPLIERS, SUPPLIER_MAP, DEFAULT_SUPPLIER_ID } from '@game/data';
import { PixelDialog, PixelStat, PixelButton, ProductSlot, QuantityStepper, money, EmptyState, PixelIcon } from './pixel';

export interface SupplierQuoteBoard {
  quotes: Record<string, { unitPrice: number; previousUnitPrice: number; changePct: number; reasons: string[]; stockLeft?: number; unavailable: boolean }>;
  deliveryDay: number;
  deliveryWeekday: string;
  bulkTiers: Array<{ minQty: number; discount: number }>;
}

interface Props {
  player: PlayerData;
  pendingOrders: SupplierOrder[];
  inventory: InventoryItem[];
  currentDay: number;
  onOrder: (id: string, n: number) => void;
  onOrderCart?: (supplierId: string, items: SupplierCartItem[]) => void;
  onGetSuggestions?: (supplierId: string) => RestockSuggestionResult;
  getQuotes?: (supplierId: string) => SupplierQuoteBoard;
  getUnitPrice?: (supplierId: string, productId: string, quantity: number) => number;
  autoBuyConfig?: { enabled: boolean; rules: AutoBuyRule[]; reports: Record<number, AutoBuyReport> };
  onUpdateAutoBuy?: (enabled: boolean, rules: AutoBuyRule[]) => { success: boolean; reason?: string };
  onClose: () => void;
}

export const SupplierModal: React.FC<Props> = ({
  player,
  pendingOrders,
  inventory,
  currentDay,
  onOrder,
  onOrderCart,
  onGetSuggestions,
  getQuotes,
  getUnitPrice,
  autoBuyConfig = { enabled: false, rules: [], reports: {} },
  onUpdateAutoBuy,
  onClose,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(DEFAULT_SUPPLIER_ID);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoProductId, setAutoProductId] = useState(ALL_PRODUCTS[0]?.id ?? '');
  const [autoSupplierId, setAutoSupplierId] = useState(DEFAULT_SUPPLIER_ID);
  const [autoThreshold, setAutoThreshold] = useState(4);
  const [autoQuantity, setAutoQuantity] = useState(8);
  const [autoBudget, setAutoBudget] = useState(50000);
  const [autoPriority, setAutoPriority] = useState(1);

  // Suggested Cart state
  const [suggestedCart, setSuggestedCart] = useState<{
    items: SuggestedCartItem[];
    constraints: string[];
    explanation: string;
  } | null>(null);

  const currentSupplier = SUPPLIER_MAP[selectedSupplierId] ?? SUPPLIERS[0];
  const discountRate = currentSupplier.discountRate ?? 0;
  const board = getQuotes?.(selectedSupplierId);

  const coldUsed = inventory.reduce(
    (n, i) => n + (PRODUCT_MAP[i.productId]?.storageType === 'cold' ? i.quantity : 0),
    0
  );
  const coldReserved = pendingOrders.reduce(
    (n, i) => n + (PRODUCT_MAP[i.productId]?.storageType === 'cold' ? i.quantity : 0),
    0
  );
  const availableCold = Math.max(0, COLD_WAREHOUSE_CAPACITY - coldUsed - coldReserved);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ALL_PRODUCTS.filter((product) => {
      const matchCat = category === 'all' || product.category === category;
      const matchSearch =
        !q || product.name.toLowerCase().includes(q) || product.id.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [category, searchTerm]);

  // Handle generating restock suggestion
  const handleGenerateSuggestion = () => {
    if (!onGetSuggestions) return;
    const res = onGetSuggestions(selectedSupplierId);
    setSuggestedCart({
      items: res.items.map((it) => ({ ...it })),
      constraints: res.appliedConstraints,
      explanation: res.explanation,
    });
  };

  // Adjust suggested item quantity
  const handleUpdateSuggestedQuantity = (productId: string, newQty: number) => {
    if (!suggestedCart) return;
    if (newQty <= 0) {
      setSuggestedCart({
        ...suggestedCart,
        items: suggestedCart.items.filter((it) => it.productId !== productId),
      });
    } else {
      setSuggestedCart({
        ...suggestedCart,
        items: suggestedCart.items.map((it) =>
          it.productId === productId
            ? { ...it, quantity: newQty, estimatedCost: newQty * it.unitPrice }
            : it
        ),
      });
    }
  };

  // Confirm and order the suggested cart
  const handleOrderSuggestedCart = () => {
    if (!suggestedCart || suggestedCart.items.length === 0) return;
    const orderItems: SupplierCartItem[] = suggestedCart.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
    }));
    if (onOrderCart) {
      onOrderCart(selectedSupplierId, orderItems);
      setSuggestedCart(null);
    }
  };

  const suggestedTotalCost = suggestedCart
    ? suggestedCart.items.reduce((sum, it) => sum + it.estimatedCost, 0)
    : 0;
  const suggestedColdUnits = suggestedCart
    ? suggestedCart.items
        .filter((it) => PRODUCT_MAP[it.productId]?.storageType === 'cold')
        .reduce((sum, it) => sum + it.quantity, 0)
    : 0;

  const minOrderMet = !currentSupplier.minOrderValue || suggestedTotalCost >= currentSupplier.minOrderValue;
  const coldOk = suggestedColdUnits <= availableCold;
  const budgetOk = suggestedTotalCost <= player.money;

  return (
    <PixelDialog
      title={currentSupplier.name}
      subtitle={currentSupplier.description}
      icon="truck"
      onClose={onClose}
    >
      {/* Supplier Selection Tabs */}
      <details className="auto-buy-panel" style={{ marginBottom: 14, padding: 12, border: '2px solid var(--teal)', background: 'var(--paper-light)' }} aria-label="Tự nhập hàng" open={autoBuyConfig.enabled || autoBuyConfig.rules.length > 0}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 8 }}>Tự nhập hàng · {autoBuyConfig.enabled ? 'đang bật' : 'đang tắt'} · {autoBuyConfig.rules.length} quy tắc</summary>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div><strong>Tự nhập hàng</strong><p className="muted" style={{ margin: '4px 0 0' }}>Tự đặt mua theo tồn kho mỗi sáng. Chức năng này đang {autoBuyConfig.enabled ? 'bật' : 'tắt'}; khác với nhân viên châm hàng từ kho.</p></div>
          <PixelButton variant={autoBuyConfig.enabled ? 'brick' : 'teal'} disabled={!onUpdateAutoBuy} onClick={() => onUpdateAutoBuy?.(!autoBuyConfig.enabled, autoBuyConfig.rules)}>{autoBuyConfig.enabled ? 'Tắt tự nhập' : 'Bật tự nhập'}</PixelButton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginTop: 12 }}>
          <label>Mặt hàng<select value={autoProductId} onChange={(e) => setAutoProductId(e.target.value)}>{ALL_PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Nhà cung cấp<select value={autoSupplierId} onChange={(e) => setAutoSupplierId(e.target.value)}>{SUPPLIERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Mua khi tồn ≤<input type="number" min={0} value={autoThreshold} onChange={(e) => setAutoThreshold(Math.max(0, Number(e.target.value)))} /></label>
          <label>Số lượng mua<input type="number" min={1} value={autoQuantity} onChange={(e) => setAutoQuantity(Math.max(1, Number(e.target.value)))} /></label>
          <label>Ngân sách quy tắc<input type="number" min={1} value={autoBudget} onChange={(e) => setAutoBudget(Math.max(1, Number(e.target.value)))} /></label>
          <label>Ưu tiên (số nhỏ trước)<input type="number" min={0} value={autoPriority} onChange={(e) => setAutoPriority(Math.max(0, Number(e.target.value)))} /></label>
        </div>
        <PixelButton variant="wood" disabled={!onUpdateAutoBuy} onClick={() => onUpdateAutoBuy?.(autoBuyConfig.enabled, [...autoBuyConfig.rules, { id: `auto-${autoProductId}-${Date.now()}`, productId: autoProductId, threshold: autoThreshold, quantity: autoQuantity, supplierId: autoSupplierId, priority: autoPriority, maxBudget: autoBudget }])}>Thêm quy tắc</PixelButton>
        {autoBuyConfig.rules.map((rule) => <div className="pending-item" key={rule.id} style={{ marginTop: 6 }}><span>Ưu tiên {rule.priority}: {PRODUCT_MAP[rule.productId]?.name ?? rule.productId}, tồn ≤ {rule.threshold}, mua {rule.quantity}, tối đa {money(rule.maxBudget)} ({SUPPLIER_MAP[rule.supplierId]?.name ?? rule.supplierId})</span><PixelButton variant="brick" onClick={() => onUpdateAutoBuy?.(autoBuyConfig.enabled, autoBuyConfig.rules.filter((item) => item.id !== rule.id))}>Xóa</PixelButton></div>)}
        {Object.values(autoBuyConfig.reports).sort((a, b) => b.day - a.day).slice(0, 3).map((report) => <p className="muted" key={report.day}>Ngày {report.day}: đã đặt {report.placed.length} dòng ({money(report.placed.reduce((n, item) => n + item.paidTotal, 0))}); bỏ qua {report.skipped.map((item) => item.reason).join(' · ') || 'không có'}.</p>)}
      </details>

      {/* Supplier Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {SUPPLIERS.map((sup) => {
          const locked = sup.unlockLevel > player.level;
          const isSelected = sup.id === selectedSupplierId;
          return (
            <PixelButton
              key={sup.id}
              variant={isSelected ? 'teal' : 'paper'}
              disabled={locked}
              onClick={() => {
                setSelectedSupplierId(sup.id);
                setSuggestedCart(null);
              }}
              style={{ flex: '1 1 140px', fontSize: '12px' }}
            >
              {sup.name} {locked ? `(Cấp ${sup.unlockLevel})` : ''}
            </PixelButton>
          );
        })}
      </div>

      <div className="summary-row">
        <PixelStat label="Tiền vốn hiện có" value={money(player.money)} icon="coin" />
        <div>
          <strong>
            {board
              ? (board.deliveryDay <= currentDay ? 'Giao hàng ngay hôm nay' : `Giao sáng ngày ${board.deliveryDay} (${board.deliveryWeekday})`)
              : currentSupplier.delayDays === 0
              ? 'Giao hàng ngay hôm nay'
              : `Giao sáng ngày ${currentDay + currentSupplier.delayDays}`}
          </strong>
          <p className="muted">
            Kho mát: {coldUsed + coldReserved}/{COLD_WAREHOUSE_CAPACITY} chỗ (còn trống {availableCold})
          </p>
          {board && board.bulkTiers.length > 0 && (
            <p className="muted">
              Ưu đãi số lượng lớn: {board.bulkTiers.map(tier => `từ ${tier.minQty} món giảm ${Math.round(tier.discount * 100)}%`).join(', ')}
            </p>
          )}
          {currentSupplier.minOrderValue ? (
            <p className="muted">
              Đơn tối thiểu: <strong>{money(currentSupplier.minOrderValue)}</strong>
              {discountRate > 0 ? ` · Giảm ${Math.round(discountRate * 100)}%` : ''}
            </p>
          ) : null}
        </div>
      </div>

      {/* Suggest Restock Button & Bar */}
      {onGetSuggestions && (
        <div
          style={{
            background: 'var(--paper-light)',
            border: '2px solid var(--wood-light)',
            padding: '10px 14px',
            marginBottom: '14px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <strong>Gợi ý thông minh</strong>
            <p className="muted" style={{ margin: 0, fontSize: '11px' }}>
              Phân tích tốc độ bán 3–7 ngày, tồn kho & đơn chờ để tính toán giỏ hàng tối ưu.
            </p>
          </div>
          <PixelButton
            variant="teal"
            icon="truck"
            onClick={handleGenerateSuggestion}
            aria-label="Tạo gợi ý nhập hàng"
          >
            Gợi ý nhập hàng
          </PixelButton>
        </div>
      )}

      {/* Suggested Cart Review Drawer */}
      {suggestedCart && (
        <section
          style={{
            background: 'var(--paper)',
            border: '2px solid var(--teal)',
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '4px',
          }}
          aria-label="Giỏ hàng gợi ý"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, color: 'var(--teal-dark)' }}>
              Giỏ hàng gợi ý ({suggestedCart.items.length} mặt hàng)
            </h3>
            <PixelButton
              variant="paper"
              onClick={() => setSuggestedCart(null)}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Đóng gợi ý
            </PixelButton>
          </div>

          <p style={{ fontSize: '12px', marginBottom: '8px', fontStyle: 'italic' }}>
            {suggestedCart.explanation}
          </p>

          {suggestedCart.constraints.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              {suggestedCart.constraints.map((c, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    background: '#fff3cd',
                    color: '#856404',
                    border: '1px solid #ffeeba',
                    fontSize: '11px',
                    padding: '2px 6px',
                    marginRight: '6px',
                    marginBottom: '4px',
                    borderRadius: '2px',
                  }}
                >
                  ⚠ {c}
                </span>
              ))}
            </div>
          )}

          {suggestedCart.items.length === 0 ? (
            <p className="muted">Không có mặt hàng nào cần nhập lúc này.</p>
          ) : (
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '10px' }}>
              {suggestedCart.items.map((item) => {
                const prod = PRODUCT_MAP[item.productId];
                const badgeLabel =
                  item.reason === 'out_of_stock'
                    ? 'Hết hàng'
                    : item.reason === 'best_seller'
                    ? 'Bán chạy'
                    : item.reason === 'low_stock'
                    ? 'Sắp hết'
                    : 'Thử nghiệm';
                const badgeColor =
                  item.reason === 'out_of_stock'
                    ? '#d90429'
                    : item.reason === 'best_seller'
                    ? '#b5838d'
                    : item.reason === 'low_stock'
                    ? '#e07a5f'
                    : '#3d5a80';

                return (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px dashed var(--wood-light)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ProductSlot productId={item.productId} />
                      <div>
                        <strong>{prod?.name ?? item.productId}</strong>
                        <span
                          style={{
                            marginLeft: '6px',
                            background: badgeColor,
                            color: '#fff',
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          {badgeLabel}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--ink-light)' }}>
                          Đơn giá: {money(item.unitPrice)} · Thành tiền: {money(item.estimatedCost)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <QuantityStepper
                        label={`Số lượng ${prod?.name ?? item.productId}`}
                        value={item.quantity}
                        min={1}
                        max={99}
                        onChange={(n) => handleUpdateSuggestedQuantity(item.productId, n)}
                      />
                      <PixelButton
                        variant="brick"
                        onClick={() => handleUpdateSuggestedQuantity(item.productId, 0)}
                        style={{ padding: '4px 6px', fontSize: '11px' }}
                        aria-label={`Xóa ${prod?.name ?? item.productId} khỏi giỏ`}
                      >
                        ✕
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {suggestedCart.items.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                borderTop: '2px solid var(--wood-light)',
                paddingTop: '8px',
              }}
            >
              <div>
                <strong>Tổng cộng: {money(suggestedTotalCost)}</strong>
                {suggestedColdUnits > 0 && (
                  <span style={{ fontSize: '11px', marginLeft: '8px', color: 'var(--ink-light)' }}>
                    (Hàng lạnh: {suggestedColdUnits} món)
                  </span>
                )}
              </div>
              <PixelButton
                variant="teal"
                disabled={!budgetOk || !minOrderMet || !coldOk}
                onClick={handleOrderSuggestedCart}
                aria-label="Xác nhận đặt toàn bộ giỏ hàng gợi ý"
              >
                {!budgetOk
                  ? `Thiếu ${money(suggestedTotalCost - player.money)}`
                  : !minOrderMet
                  ? `Chưa đạt tối thiểu ${money(currentSupplier.minOrderValue ?? 0)}`
                  : !coldOk
                  ? 'Vượt dung lượng kho mát'
                  : 'Xác nhận đặt giỏ hàng này'}
              </PixelButton>
            </div>
          )}
        </section>
      )}

      {/* Filter and Search */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <label className="form-filter" style={{ flex: '1 1 200px', margin: 0 }}>
          Tìm kiếm
          <input
            type="search"
            placeholder="Tìm theo tên hoặc mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              minHeight: '44px',
              width: '100%',
              background: 'var(--paper)',
              border: '2px solid var(--wood-light)',
              padding: '8px',
              color: 'var(--ink)',
            }}
          />
        </label>
        <label className="form-filter" style={{ flex: '1 1 200px', margin: 0 }}>
          Nhóm hàng
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory | 'all')}
            style={{ width: '100%' }}
          >
            <option value="all">Tất cả ({ALL_PRODUCTS.length} món)</option>
            {Object.entries(PRODUCT_CATEGORY_LABELS).map(([id, name]) => {
              const count = ALL_PRODUCTS.filter((p) => p.category === id).length;
              return (
                <option key={id} value={id}>
                  {name} ({count})
                </option>
              );
            })}
          </select>
        </label>
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState title="Không tìm thấy mặt hàng" icon="bag">
          Không có sản phẩm nào khớp với tìm kiếm hoặc bộ lọc nhóm hàng hiện tại.
        </EmptyState>
      ) : (
        filteredProducts.map((product) => {
          const quantity = quantities[product.id] ?? 1;
          const quote = board?.quotes[product.id];
          const discountedUnitPrice = getUnitPrice ? getUnitPrice(selectedSupplierId, product.id, quantity) : Math.round(product.purchasePrice * (1 - discountRate));
          const cost = quantity * discountedUnitPrice;
          const locked = product.unlockLevel > player.level;
          const coldFull =
            product.storageType === 'cold' &&
            coldUsed + coldReserved + quantity > COLD_WAREHOUSE_CAPACITY;
          const reason = locked
            ? `Mở khóa ở cấp ${product.unlockLevel}`
            : quote?.unavailable
            ? `${currentSupplier.name} tạm ngừng cung`
            : quote?.stockLeft !== undefined && quantity > quote.stockLeft
            ? `Nhà cung cấp chỉ còn ${quote.stockLeft}`
            : cost > player.money
            ? `Thiếu ${money(cost - player.money)}`
            : coldFull
            ? 'Kho mát không đủ chỗ'
            : '';

          return (
            <article
              key={product.id}
              className={`product-row ${locked ? 'is-locked' : ''}`}
              aria-label={product.name}
            >
              <ProductSlot productId={product.id} />
              <div className="product-info">
                <h3>{product.name}</h3>
                <p>
                  {PRODUCT_CATEGORY_LABELS[product.category]}
                  {product.storageType === 'cold' ? ' · Giữ mát' : ''}
                </p>
                <p>
                  Giá sỉ <strong>{money(discountedUnitPrice)}</strong>
                  {discountRate > 0 ? (
                    <span style={{ fontSize: '11px', color: 'var(--teal)' }}>
                      {' '}
                      (-{Math.round(discountRate * 100)}%)
                    </span>
                  ) : null}{' '}
                  · Tổng <strong>{money(cost)}</strong>
                </p>
                {quote && (quote.changePct !== 0 || quote.reasons.length > 0 || quote.stockLeft !== undefined) && (
                  <p className="muted" style={{ fontSize: '11px' }}>
                    {quote.changePct !== 0 && <strong style={{ color: quote.changePct > 0 ? 'var(--brick, #b64c3d)' : 'var(--teal)' }}>{quote.changePct > 0 ? '↑' : '↓'} {quote.changePct > 0 ? '+' : ''}{quote.changePct}% so với hôm qua </strong>}
                    {quote.reasons.length > 0 && <span>· {quote.reasons.join('; ')} </span>}
                    {quote.stockLeft !== undefined && !quote.unavailable && <span>· Còn {quote.stockLeft} hôm nay</span>}
                  </p>
                )}
                {reason && <p className="action-reason">{reason}</p>}
              </div>
              <div className="product-actions">
                <QuantityStepper
                  label={`Số lượng ${product.name}`}
                  value={quantity}
                  disabled={locked}
                  onChange={(n) => setQuantities((old) => ({ ...old, [product.id]: n }))}
                />
                <PixelButton
                  variant="teal"
                  onClick={() => {
                    if (onOrderCart) {
                      onOrderCart(selectedSupplierId, [{ productId: product.id, quantity }]);
                    } else {
                      onOrder(product.id, quantity);
                    }
                  }}
                  disabled={!!reason}
                  aria-label={`Đặt ${product.name}`}
                >
                  Đặt hàng
                </PixelButton>
              </div>
            </article>
          );
        })
      )}

      <section className="pending-orders">
        <h3>Đơn hàng đang giao · {pendingOrders.length}</h3>
        {pendingOrders.length ? (
          pendingOrders.map((order) => (
            <div className="pending-item" key={order.id}>
              <strong>
                {PRODUCT_MAP[order.productId]?.name ?? order.productId} × {order.quantity}
              </strong>
              <span>
                Ngày {order.arrivalDay} ({SUPPLIER_MAP[order.supplierId ?? DEFAULT_SUPPLIER_ID]?.name ?? 'Mối quen'})
              </span>
            </div>
          ))
        ) : (
          <p className="muted">Chưa có đơn hàng đang giao.</p>
        )}
      </section>
    </PixelDialog>
  );
};
