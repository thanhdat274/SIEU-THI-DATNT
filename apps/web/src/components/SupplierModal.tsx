import React, { useState, useMemo } from 'react';
import {
  PlayerData,
  InventoryItem,
  SupplierOrder,
  ProductCategory,
  COLD_WAREHOUSE_CAPACITY,
  SupplierCartItem,
  RestockSuggestionResult,
  RestockBudgetSplit,
  SuggestedCartItem,
  AutoBuyRule,
  AutoBuyReport,
} from '@game/shared';
import { ALL_PRODUCTS, PRODUCT_MAP, PRODUCT_CATEGORY_LABELS, SUPPLIERS, SUPPLIER_MAP, DEFAULT_SUPPLIER_ID } from '@game/data';
import { addRecommendation, setCartQuantity } from './supplier-cart';
import { PixelDialog, PixelStat, PixelButton, ProductSlot, QuantityStepper, money, EmptyState } from './pixel';

export interface SupplierQuoteBoard {
  quotes: Record<string, { unitPrice: number; previousUnitPrice: number; changePct: number; reasons: string[]; stockLeft?: number; unavailable: boolean }>;
  deliveryDay: number;
  deliveryWeekday: string;
  bulkTiers: Array<{ minQty: number; discount: number }>;
}

interface Props {
  coldCapacity?: number;
  player: PlayerData;
  pendingOrders: SupplierOrder[];
  inventory: InventoryItem[];
  currentDay: number;
  onOrder: (id: string, n: number) => void;
  onOrderCart?: (supplierId: string, items: SupplierCartItem[]) => void;
  onGetSuggestions?: (supplierId: string, cart: Record<string, number>) => RestockSuggestionResult;
  getQuotes?: (supplierId: string) => SupplierQuoteBoard;
  getUnitPrice?: (supplierId: string, productId: string, quantity: number) => number;
  autoBuyConfig?: { enabled: boolean; rules: AutoBuyRule[]; reports: Record<number, AutoBuyReport> };
  onUpdateAutoBuy?: (enabled: boolean, rules: AutoBuyRule[]) => { success: boolean; reason?: string };
  onClose: () => void;
}

export const SupplierModal: React.FC<Props> = ({
  coldCapacity = COLD_WAREHOUSE_CAPACITY,
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
  // quantities: mặc định 0 — người chơi bấm + để thêm vào giỏ
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
    budget?: RestockBudgetSplit;
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
  const availableCold = Math.max(0, coldCapacity - coldUsed - coldReserved);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ALL_PRODUCTS.filter((product) => {
      const matchCat = category === 'all' || product.category === category;
      const matchSearch =
        !q || product.name.toLowerCase().includes(q) || product.id.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [category, searchTerm]);

  // ===== GIỎ ĐẶT HÀNG: sản phẩm có số lượng > 0 =====
  const cartItems = useMemo(() => {
    return ALL_PRODUCTS
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => {
        const qty = quantities[p.id]!;
        const discountedUnitPrice = getUnitPrice
          ? getUnitPrice(selectedSupplierId, p.id, qty)
          : Math.round(p.purchasePrice * (1 - discountRate));
        return { product: p, qty, unitPrice: discountedUnitPrice, total: qty * discountedUnitPrice };
      });
  }, [quantities, selectedSupplierId, discountRate, getUnitPrice]);

  const cartTotal = cartItems.reduce((sum, it) => sum + it.total, 0);
  const cartColdUnits = cartItems
    .filter((it) => it.product.storageType === 'cold')
    .reduce((sum, it) => sum + it.qty, 0);

  const cartMinOrderMet = !currentSupplier.minOrderValue || cartTotal >= currentSupplier.minOrderValue;
  const cartColdOk = cartColdUnits <= availableCold;
  const cartBudgetOk = cartTotal <= player.money;
  const cartHasItems = cartItems.length > 0;

  const handlePlaceCartOrder = () => {
    if (!cartHasItems) return;
    const items: SupplierCartItem[] = cartItems.map((it) => ({
      productId: it.product.id,
      quantity: it.qty,
    }));
    if (onOrderCart) {
      onOrderCart(selectedSupplierId, items);
    } else {
      // fallback: đặt từng món
      for (const it of items) {
        onOrder(it.productId, it.quantity);
      }
    }
    // Reset giỏ sau khi đặt
    clearCart();
  };

  // Số lượng tối đa mua được của một mặt hàng từ NCC đang chọn (tồn NCC hôm nay).
  const maxQtyFor = (productId: string): number => {
    const quote = board?.quotes[productId];
    if (quote?.unavailable) return 0;
    return quote?.stockLeft ?? 99;
  };

  // Nguồn sự thật duy nhất của số lượng đặt: `quantities`. Luôn kẹp theo tồn NCC.
  const setCartQty = (productId: string, n: number) =>
    setQuantities((old) => setCartQuantity(old, productId, n, maxQtyFor(productId)));

  const clearCart = () => {
    setQuantities({});
    setSuggestedCart(null);
  };

  // Thêm số lượng gợi ý vào giỏ: min(gợi ý, tồn NCC - đã có trong giỏ)
  const addSuggestedToQuantities = (base: Record<string, number>, items: SuggestedCartItem[]) =>
    items.reduce((cart, it) => addRecommendation(cart, it.productId, it.quantity, maxQtyFor(it.productId)), base);

  const handleGenerateSuggestion = () => {
    if (!onGetSuggestions) return;
    // Truyền giỏ đang soạn để gợi ý chỉ tiêu phần tiền còn lại (bấm nhiều lần không cộng dồn vượt tiền).
    const res = onGetSuggestions(selectedSupplierId, quantities);
    setSuggestedCart({
      items: res.items.map((it) => ({ ...it })),
      constraints: res.appliedConstraints,
      explanation: res.explanation,
      budget: res.budget,
    });
    setQuantities((old) => addSuggestedToQuantities(old, res.items));
  };

  const cartOrderLabel = !cartBudgetOk
    ? `Thiếu ${money(cartTotal - player.money)}`
    : !cartMinOrderMet
    ? `Chưa đạt tối thiểu ${money(currentSupplier.minOrderValue ?? 0)}`
    : !cartColdOk
    ? 'Vượt dung lượng kho mát'
    : `Đặt hàng · ${money(cartTotal)}`;

  return (
    <PixelDialog
      title={currentSupplier.name}
      subtitle={currentSupplier.description}
      icon="truck"
      onClose={onClose}
    >
      {/* Auto Buy Panel */}
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
                setQuantities({});
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
            Kho mát: {coldUsed + coldReserved}/{coldCapacity} chỗ (còn trống {availableCold})
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

      {/* Suggest Restock Button */}
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
              Phân tích tốc độ bán 3–7 ngày, tồn kho &amp; đơn chờ. Chia tiền còn lại: 40% hàng đang bán, 60% nhập thử hàng mới; không vượt tiền đang có.
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

      {/* Suggested Cart Review Drawer — chỉ hiển thị giải thích, không có nút đặt riêng nữa */}
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
              Gợi ý nhập hàng ({suggestedCart.items.length} mặt hàng · đã thêm vào giỏ ↓)
            </h3>
            <PixelButton
              variant="paper"
              onClick={() => setSuggestedCart(null)}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Đóng
            </PixelButton>
          </div>

          <p style={{ fontSize: '12px', marginBottom: '8px', fontStyle: 'italic' }}>
            {suggestedCart.explanation}
          </p>

          {suggestedCart.budget && suggestedCart.budget.spendable > 0 && (
            <p className="muted" style={{ fontSize: '11px', margin: '0 0 8px' }}>
              Tiền dùng cho gợi ý {money(suggestedCart.budget.spendable)} · Hàng đang bán {money(suggestedCart.budget.provenSpent)} / {money(suggestedCart.budget.provenTarget)} (40%) · Hàng mới thử {money(suggestedCart.budget.trialSpent)} / {money(suggestedCart.budget.trialTarget)} (60%)
            </p>
          )}

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
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {suggestedCart.items.map((item) => {
                const prod = PRODUCT_MAP[item.productId];
                const badgeLabel =
                  item.reason === 'out_of_stock' ? 'Hết hàng'
                  : item.reason === 'best_seller' ? 'Bán chạy'
                  : item.reason === 'low_stock' ? 'Sắp hết'
                  : item.reason === 'slow_seller' ? 'Bán chậm'
                  : 'Hàng mới thử';
                const badgeColor =
                  item.reason === 'out_of_stock' ? '#d90429'
                  : item.reason === 'best_seller' ? '#b5838d'
                  : item.reason === 'low_stock' ? '#e07a5f'
                  : item.reason === 'slow_seller' ? '#6c757d'
                  : '#3d5a80';
                const inCart = quantities[item.productId] ?? 0;
                const maxQty = maxQtyFor(item.productId);
                const shopStock = inventory.find((i) => i.productId === item.productId)?.quantity ?? 0;
                return (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      borderBottom: '1px dashed var(--wood-light)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ProductSlot productId={item.productId} />
                      <div>
                        <strong style={{ fontSize: '12px' }}>{prod?.name ?? item.productId}</strong>
                        <span style={{ marginLeft: '5px', background: badgeColor, color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '3px' }}>{badgeLabel}</span>
                        <div style={{ fontSize: '11px', color: 'var(--ink-light)' }}>
                          Tiệm còn {shopStock} · NCC còn {maxQty >= 99 ? '∞' : maxQty} · Gợi ý {item.quantity} · Tối đa {maxQty}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {inCart > 0 ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal-dark)' }}>✓ Trong giỏ: {inCart}</span>
                      ) : (
                        <PixelButton
                          variant="teal"
                          disabled={maxQty <= 0}
                          onClick={() => setQuantities((old) => addSuggestedToQuantities(old, [item]))}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          aria-label={`Thêm gợi ý ${prod?.name ?? item.productId}`}
                        >
                          {maxQty <= 0 ? 'Hết hàng NCC' : 'Thêm'}
                        </PixelButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="muted" style={{ margin: '8px 0 0', fontSize: '11px' }}>
            Gợi ý chỉ là số tham khảo; số lượng thật nằm trong giỏ bên dưới (không vượt tồn NCC). Chỉnh ở giỏ rồi bấm <strong>Đặt hàng</strong> một lần.
          </p>
        </section>
      )}

      {/* Tìm kiếm + Bộ lọc danh mục dạng nút nhanh */}
      <div style={{ marginBottom: '14px' }}>
        {/* Ô tìm kiếm */}
        <input
          type="search"
          placeholder="🔍 Tìm theo tên hoặc mã..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            minHeight: '40px',
            background: 'var(--paper)',
            border: '2px solid var(--wood-light)',
            padding: '6px 10px',
            color: 'var(--ink)',
            marginBottom: '10px',
            boxSizing: 'border-box',
          }}
        />

        {/* Nút phân loại nhanh */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {/* Nút "Tất cả" */}
          <button
            type="button"
            onClick={() => setCategory('all')}
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '4px',
              border: '2px solid',
              transition: 'all 0.15s',
              borderColor: category === 'all' ? 'var(--teal-dark)' : 'var(--wood-light)',
              background: category === 'all' ? 'var(--teal)' : 'var(--paper)',
              color: category === 'all' ? '#fff' : 'var(--ink)',
            }}
          >
            Tất cả ({ALL_PRODUCTS.length})
          </button>

          {/* Một nút cho mỗi danh mục */}
          {(Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]).map(([id, name]) => {
            const count = ALL_PRODUCTS.filter((p) => p.category === id).length;
            const isActive = category === id;
            // Emoji theo danh mục
            const emoji: Record<string, string> = {
              instant_noodles: '🍜',
              snacks: '🍘',
              candy: '🍬',
              bottled_water: '💧',
              soft_drinks: '🥤',
              milk: '🥛',
              bread: '🍞',
              eggs: '🥚',
              cooking_ingredients: '🧂',
              household: '🧹',
            };
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(isActive ? 'all' : id)}
                title={`${name} · ${count} sản phẩm`}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 400,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: '2px solid',
                  transition: 'all 0.15s',
                  borderColor: isActive ? 'var(--teal-dark)' : 'var(--wood-light)',
                  background: isActive ? 'var(--teal)' : 'var(--paper-light)',
                  color: isActive ? '#fff' : 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                {emoji[id] ?? '📦'} {name}
                <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.75 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>


      {/* Product List — mỗi dòng chỉ có stepper (+/-), không có nút Đặt hàng riêng */}
      {filteredProducts.length === 0 ? (
        <EmptyState title="Không tìm thấy mặt hàng" icon="bag">
          Không có sản phẩm nào khớp với tìm kiếm hoặc bộ lọc nhóm hàng hiện tại.
        </EmptyState>
      ) : (
        filteredProducts.map((product) => {
          const quantity = quantities[product.id] ?? 0;
          const quote = board?.quotes[product.id];
          const discountedUnitPrice = getUnitPrice
            ? getUnitPrice(selectedSupplierId, product.id, Math.max(1, quantity))
            : Math.round(product.purchasePrice * (1 - discountRate));
          const cost = quantity * discountedUnitPrice;
          const locked = product.unlockLevel > player.level;

          const reason = locked
            ? `Mở khóa ở cấp ${product.unlockLevel}`
            : quote?.unavailable
            ? `${currentSupplier.name} tạm ngừng cung`
            : '';

          return (
            <article
              key={product.id}
              className={`product-row ${locked ? 'is-locked' : ''} ${quantity > 0 ? 'in-cart' : ''}`}
              aria-label={product.name}
              style={quantity > 0 ? { background: 'rgba(53,127,114,0.07)', borderLeft: '3px solid var(--teal)' } : undefined}
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
                  ) : null}
                  {quantity > 0 && (
                    <span style={{ marginLeft: 6, color: 'var(--teal-dark)', fontWeight: 700 }}>
                      · Tổng <strong>{money(cost)}</strong>
                    </span>
                  )}
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
              {/* Chỉ có stepper — không có nút Đặt hàng riêng */}
              <div className="product-actions">
                <QuantityStepper
                  label={`Số lượng ${product.name}`}
                  value={quantity}
                  min={0}
                  disabled={locked || maxQtyFor(product.id) <= 0}
                  max={Math.max(0, maxQtyFor(product.id))}
                  onChange={(n) => setCartQty(product.id, n)}
                />
                {quantity > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--teal-dark)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ✓ Đã chọn
                  </span>
                )}
              </div>
            </article>
          );
        })
      )}

      {/* ===== GIỎ HÀNG & NÚT ĐẶT HÀNG DUY NHẤT ===== */}
      <section
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--paper)',
          border: '2px solid var(--teal)',
          borderRadius: '4px',
          marginTop: '16px',
          padding: '12px 16px',
          zIndex: 10,
        }}
        aria-label="Giỏ đặt hàng"
      >
        {cartHasItems ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <div>
                <strong style={{ color: 'var(--teal-dark)' }}>
                  🛒 Giỏ đặt hàng · {cartItems.length} loại · {cartItems.reduce((s, it) => s + it.qty, 0)} đơn vị
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--ink-light)', marginTop: '2px' }}>
                  {cartItems.map((it) => `${it.product.name} ×${it.qty}`).join(' · ')}
                </div>
              </div>
              <PixelButton
                variant="paper"
                onClick={clearCart}
                style={{ fontSize: '11px', padding: '4px 8px' }}
                aria-label="Xóa giỏ hàng"
              >
                Xóa giỏ
              </PixelButton>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--wood-light)', paddingTop: '8px' }}>
              <div>
                <strong style={{ fontSize: '15px' }}>Tổng: {money(cartTotal)}</strong>
                {cartColdUnits > 0 && (
                  <span style={{ fontSize: '11px', marginLeft: '8px', color: 'var(--ink-light)' }}>
                    (Hàng lạnh: {cartColdUnits} món)
                  </span>
                )}
                {!cartBudgetOk && (
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--brick)' }}>
                    Thiếu {money(cartTotal - player.money)}
                  </span>
                )}
                {!cartMinOrderMet && cartBudgetOk && (
                  <span style={{ display: 'block', fontSize: '11px', color: '#856404' }}>
                    Chưa đạt đơn tối thiểu {money(currentSupplier.minOrderValue ?? 0)}
                  </span>
                )}
                {!cartColdOk && cartColdUnits > 0 && (
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--brick)' }}>
                    Vượt sức chứa kho mát ({cartColdUnits}/{availableCold})
                  </span>
                )}
              </div>
              <PixelButton
                variant="teal"
                disabled={!cartBudgetOk || !cartMinOrderMet || !cartColdOk}
                onClick={handlePlaceCartOrder}
                aria-label="Xác nhận đặt toàn bộ giỏ hàng"
                style={{ fontSize: '14px', padding: '10px 20px', fontWeight: 700 }}
              >
                {cartOrderLabel}
              </PixelButton>
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0, textAlign: 'center', padding: '4px 0' }}>
            🛒 Giỏ trống — bấm <strong>+</strong> vào sản phẩm để thêm vào giỏ, rồi đặt một lần
          </p>
        )}
      </section>

      {/* Đơn hàng đang giao */}
      <section className="pending-orders" style={{ marginTop: '16px' }}>
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
