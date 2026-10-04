import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  PlayerData,
  InventoryItem,
  SupplierOrder,
  ProductCategory,
  COLD_WAREHOUSE_CAPACITY,
  SupplierCartItem,
  RestockSuggestionResult,
  RestockBudgetSplit,
  RestockSuggestionOptions,
  SuggestedCartItem,
  AutoBuyRule,
  AutoBuyReport,
} from '@game/shared';
import { ALL_PRODUCTS, PRODUCT_MAP, PRODUCT_CATEGORY_LABELS, SUPPLIERS, SUPPLIER_MAP, DEFAULT_SUPPLIER_ID } from '@game/data';
import { normalizeRestockOptions } from '@game/core';
import { addRecommendation, setCartQuantity } from './supplier-cart';
import { PixelDialog, PixelStat, PixelButton, ProductSlot, QuantityStepper, money, EmptyState } from './pixel';

const SUGGEST_OPTIONS_KEY = 'supplier-suggest-options';
// Bản lưu trong save (`savedRestockOptions`) được ưu tiên; localStorage là dự phòng cho save cũ và tiệm online (không ghi save cục bộ).
function loadSuggestOptions(saved?: RestockSuggestionOptions): Required<RestockSuggestionOptions> {
  if (saved) return normalizeRestockOptions(saved);
  try {
    return normalizeRestockOptions(JSON.parse(localStorage.getItem(SUGGEST_OPTIONS_KEY) ?? 'null') as RestockSuggestionOptions | null);
  } catch {
    return normalizeRestockOptions();
  }
}

const SUGGEST_INPUT_STYLE: React.CSSProperties = { height: 28, border: '2px solid var(--wood-light)', background: '#FFFAEE', color: 'var(--ink)', textAlign: 'center', fontWeight: 700, borderRadius: 0, margin: '0 2px' };

/** Một IntersectionObserver dùng chung cho mọi dòng, tránh tạo hàng trăm observer. */
const lazyCallbacks = new WeakMap<Element, (visible: boolean) => void>();
const lazyObservers = new WeakMap<Element, IntersectionObserver>();
function observeLazy(el: Element, cb: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') { cb(true); return () => undefined; }
  // Phải lấy khung cuộn làm root: với root mặc định thì rootMargin không nới được vùng bị cắt bởi khung cuộn.
  const root = el.closest('.dialog-content');
  const key = root ?? document.documentElement;
  let observer = lazyObservers.get(key);
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) lazyCallbacks.get(entry.target)?.(entry.isIntersecting);
    }, { root, rootMargin: '600px 0px' });
    lazyObservers.set(key, observer);
  }
  lazyCallbacks.set(el, cb);
  observer.observe(el);
  return () => { lazyCallbacks.delete(el); observer.unobserve(el); };
}

/**
 * Chỉ dựng nội dung dòng khi nó nằm gần vùng nhìn thấy (đệm 600px); dòng ở xa được thay bằng khung trống
 * có đúng chiều cao đã đo nên thanh cuộn không nhảy. Danh sách ~480 dòng chỉ còn vài chục dòng thật trong DOM.
 */
function LazyRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const heightRef = useRef(120);
  useEffect(() => (ref.current ? observeLazy(ref.current, setVisible) : undefined), []);
  useEffect(() => {
    if (visible && ref.current) heightRef.current = ref.current.offsetHeight || heightRef.current;
  });
  return (
    <div ref={ref} style={{ display: 'flow-root', minHeight: visible ? undefined : heightRef.current }}>
      {visible ? children : null}
    </div>
  );
}

interface ProductRowProps {
  product: (typeof ALL_PRODUCTS)[number];
  quantity: number;
  unitPrice: number;
  locked: boolean;
  discountRate: number;
  supplierName: string;
  maxQty: number;
  changePct?: number;
  reasonsText?: string;
  stockLeft?: number;
  unavailable?: boolean;
  onSetQty: (productId: string, n: number) => void;
}

/**
 * Một dòng sản phẩm trong danh sách nhập. Đóng gói và memo để bấm +/- chỉ vẽ lại đúng dòng đó
 * (trước đây mỗi lần đổi số lượng cả ~300 dòng cùng biểu tượng SVG được dựng lại).
 */
const SupplierProductRow = React.memo(function SupplierProductRow({ product, quantity, unitPrice, locked, discountRate, supplierName, maxQty, changePct, reasonsText, stockLeft, unavailable, onSetQty }: ProductRowProps) {
  const packSize = product.caseSize ?? 1;
  const packCount = quantity / packSize;
  const cost = quantity * unitPrice;
  const hasQuote = changePct !== undefined;
  const reason = locked ? `Mở khóa ở cấp ${product.unlockLevel}` : unavailable ? `${supplierName} tạm ngừng cung` : '';
  return (
    <article
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
          Giá sỉ <strong>{money(unitPrice)}</strong>
          {discountRate > 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--teal)' }}>
              {' '}
              (-{Math.round(discountRate * 100)}%)
            </span>
          ) : null}
          {quantity > 0 && !product.caseSize && (
            <span style={{ marginLeft: 6, color: 'var(--teal-dark)', fontWeight: 700 }}>
              · Tổng <strong>{money(cost)}</strong>
            </span>
          )}
        </p>
        {hasQuote && (changePct !== 0 || !!reasonsText || stockLeft !== undefined) && (
          <p className="muted" style={{ fontSize: '11px' }}>
            {changePct !== 0 && <strong style={{ color: changePct! > 0 ? 'var(--brick, #b64c3d)' : 'var(--teal)' }}>{changePct! > 0 ? '↑' : '↓'} {changePct! > 0 ? '+' : ''}{changePct}% so với hôm qua </strong>}
            {reasonsText && <span>· {reasonsText} </span>}
            {stockLeft !== undefined && !unavailable && <span>· Còn {stockLeft} hôm nay</span>}
          </p>
        )}
        {reason && <p className="action-reason">{reason}</p>}
      </div>
      {/* Số lượng ở đây là số thùng/vỉ, được đổi sang đơn vị bán lẻ khi đặt. */}
      <div className="product-actions">
        <QuantityStepper
          label={`Số ${product.caseSize ? 'thùng' : 'món'} ${product.name}`}
          value={packCount}
          min={0}
          disabled={locked || maxQty <= 0}
          max={Math.floor(Math.max(0, maxQty) / packSize)}
          onChange={(n) => onSetQty(product.id, n * packSize)}
        />
        <span style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{quantity} món</span>
        {quantity > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--teal-dark)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ✓ Đã chọn
          </span>
        )}
      </div>
    </article>
  );
});

export interface SupplierQuoteBoard {
  quotes: Record<string, { unitPrice: number; previousUnitPrice: number; changePct: number; reasons: string[]; stockLeft?: number; unavailable: boolean }>;
  deliveryDay: number;
  deliveryWeekday: string;
  bulkTiers: Array<{ minQty: number; discount: number }>;
}

export interface Props {
  coldCapacity?: number;
  player: PlayerData;
  pendingOrders: SupplierOrder[];
  inventory: InventoryItem[];
  currentDay: number;
  onOrder: (id: string, n: number) => void;
  onOrderCart?: (supplierId: string, items: SupplierCartItem[]) => void;
  /** Cài đặt gợi ý đã lưu trong save (thiếu = đọc localStorage cũ). */
  savedRestockOptions?: RestockSuggestionOptions;
  /** Gọi mỗi khi người chơi đổi cài đặt để ghi vào save. */
  onSaveRestockOptions?: (options: RestockSuggestionOptions) => void;
  onGetSuggestions?: (supplierId: string, cart: Record<string, number>, options: RestockSuggestionOptions) => RestockSuggestionResult;
  getQuotes?: (supplierId: string) => SupplierQuoteBoard;
  getUnitPrice?: (supplierId: string, productId: string, quantity: number) => number;
  autoBuyConfig?: { enabled: boolean; stalls?: boolean; rules: AutoBuyRule[]; reports: Record<number, AutoBuyReport> };
  onUpdateAutoBuy?: (enabled: boolean, rules: AutoBuyRule[]) => { success: boolean; reason?: string };
  onToggleAutoBuyStalls?: (enabled: boolean) => void;
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
  savedRestockOptions,
  onSaveRestockOptions,
  getQuotes,
  getUnitPrice,
  autoBuyConfig = { enabled: false, rules: [], reports: {} },
  onUpdateAutoBuy,
  onToggleAutoBuyStalls,
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

  const [suggestOptions, setSuggestOptions] = useState<Required<RestockSuggestionOptions>>(() => loadSuggestOptions(savedRestockOptions));
  const saveSuggestOptions = (next: Required<RestockSuggestionOptions>) => {
    setSuggestOptions(next);
    try { localStorage.setItem(SUGGEST_OPTIONS_KEY, JSON.stringify(next)); } catch { /* không lưu được thì bỏ qua */ }
    onSaveRestockOptions?.(next);
  };
  // Ô nhập giữ dạng chuỗi để xóa trống/gõ dở không bị ép về 0; chỉ áp dụng khi bấm Lưu (hoặc Gợi ý nhập hàng).
  const [suggestDraft, setSuggestDraft] = useState(() => ({
    provenSharePct: String(suggestOptions.provenSharePct),
    maxTrialProducts: String(suggestOptions.maxTrialProducts),
    cashReservePct: String(suggestOptions.cashReservePct),
  }));
  const setDraftField = (key: keyof typeof suggestDraft, value: string) => setSuggestDraft((d) => ({ ...d, [key]: value }));
  const commitSuggestDraft = (): Required<RestockSuggestionOptions> => {
    const parse = (raw: string, fallback: number) => (raw.trim() === '' || !Number.isFinite(Number(raw)) ? fallback : Number(raw));
    const next = normalizeRestockOptions({
      ...suggestOptions,
      provenSharePct: parse(suggestDraft.provenSharePct, suggestOptions.provenSharePct),
      maxTrialProducts: parse(suggestDraft.maxTrialProducts, suggestOptions.maxTrialProducts),
      cashReservePct: parse(suggestDraft.cashReservePct, suggestOptions.cashReservePct),
    });
    setSuggestDraft({
      provenSharePct: String(next.provenSharePct),
      maxTrialProducts: String(next.maxTrialProducts),
      cashReservePct: String(next.cashReservePct),
    });
    saveSuggestOptions(next);
    return next;
  };
  const draftDirty =
    suggestDraft.provenSharePct !== String(suggestOptions.provenSharePct) ||
    suggestDraft.maxTrialProducts !== String(suggestOptions.maxTrialProducts) ||
    suggestDraft.cashReservePct !== String(suggestOptions.cashReservePct);

  // Suggested Cart state
  const suggestionRef = useRef<HTMLElement>(null);
  const [suggestedCart, setSuggestedCart] = useState<{
    items: SuggestedCartItem[];
    constraints: string[];
    explanation: string;
    budget?: RestockBudgetSplit;
  } | null>(null);

  // Khung giải thích nằm dưới thanh giỏ cố định nên cuộn tới khi có gợi ý mới.
  useEffect(() => {
    if (suggestedCart) suggestionRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [suggestedCart]);

  const currentSupplier = SUPPLIER_MAP[selectedSupplierId] ?? SUPPLIERS[0];
  const discountRate = currentSupplier.discountRate ?? 0;
  const board = getQuotes?.(selectedSupplierId);
  const unitPriceFor = useCallback((productId: string, quantity: number) => getUnitPrice
    ? getUnitPrice(selectedSupplierId, productId, Math.max(1, quantity))
    : Math.round((PRODUCT_MAP[productId]?.purchasePrice ?? 1) * (1 - discountRate)), [getUnitPrice, selectedSupplierId, discountRate]);
  const estimateCartCost = useCallback((items: SupplierCartItem[]) => items.reduce((sum, item) => {
    const product = PRODUCT_MAP[item.productId];
    const unit = unitPriceFor(item.productId, item.quantity);
    const packs = product?.caseSize ? Math.floor(item.quantity / product.caseSize) : 0;
    const remainder = product?.caseSize ? item.quantity % product.caseSize : item.quantity;
    const casePrice = product?.caseSize ? Math.round(unit * product.caseSize * 0.95) : 0;
    return sum + (packs ? packs * casePrice + remainder * unit : item.quantity * unit);
  }, 0), [unitPriceFor]);

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
    const matched = ALL_PRODUCTS.filter((product) => {
      const matchCat = category === 'all' || product.category === category;
      const matchSearch =
        !q || product.name.toLowerCase().includes(q) || product.id.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
    // Đã mở khóa lên trước (giữ thứ tự gốc); chưa mở khóa xuống sau, cấp thấp hơn đứng trước.
    const unlocked = matched.filter((product) => product.unlockLevel <= player.level);
    const locked = matched
      .filter((product) => product.unlockLevel > player.level)
      .sort((a, b) => a.unlockLevel - b.unlockLevel);
    return [...unlocked, ...locked];
  }, [category, searchTerm, player.level]);

  // ===== GIỎ ĐẶT HÀNG: sản phẩm có số lượng > 0 =====
  const cartItems = useMemo(() => {
    return ALL_PRODUCTS
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => {
        const qty = quantities[p.id]!;
        const discountedUnitPrice = unitPriceFor(p.id, qty);
        return { product: p, qty, packs: p.caseSize ? qty / p.caseSize : qty, unitPrice: discountedUnitPrice, total: estimateCartCost([{ productId: p.id, quantity: qty }]) };
      });
  }, [quantities, estimateCartCost, unitPriceFor]);

  const cartTotal = estimateCartCost(cartItems.map((it) => ({ productId: it.product.id, quantity: it.qty })));
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
    const stock = quote?.stockLeft ?? 99;
    return Math.floor(stock / (PRODUCT_MAP[productId]?.caseSize ?? 1)) * (PRODUCT_MAP[productId]?.caseSize ?? 1);
  };

  // Nguồn sự thật duy nhất của số lượng đặt: `quantities`. Luôn kẹp theo tồn NCC.
  // Danh tính ổn định (đọc maxQtyFor mới nhất qua ref) để các dòng memo không vẽ lại khi cha vẽ lại.
  const maxQtyForRef = useRef(maxQtyFor);
  maxQtyForRef.current = maxQtyFor;
  const setCartQty = useCallback((productId: string, n: number) =>
    setQuantities((old) => setCartQuantity(old, productId, n, maxQtyForRef.current(productId))), []);

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
    const res = onGetSuggestions(selectedSupplierId, quantities, draftDirty ? commitSuggestDraft() : suggestOptions);
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
      <details className="auto-buy-panel" style={{ marginBottom: 14, padding: 12, border: '2px solid var(--teal)', background: 'var(--paper-light)' }} aria-label="Tự nhập hàng" open={autoBuyConfig.enabled || !!autoBuyConfig.stalls || autoBuyConfig.rules.length > 0}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 8 }}>Tự nhập hàng · {autoBuyConfig.enabled ? 'đang bật' : 'đang tắt'} · {autoBuyConfig.rules.length} quy tắc</summary>
        <label style={{ display: 'block', margin: '0 0 8px', fontSize: 12 }} title="Mỗi sáng nếu kho thiếu nguyên liệu cho quầy cà phê/bánh mì đã mở, game tự chọn đại lý, đặt đủ ~3 ngày và trừ tiền (vẫn chừa lương/thuế; thiếu tiền thì mua phần làm được)">
          <input type="checkbox" checked={!!autoBuyConfig.stalls} disabled={!onToggleAutoBuyStalls} onChange={(e) => onToggleAutoBuyStalls?.(e.target.checked)} /> Tự nhập nguyên liệu cho quầy ăn uống mỗi sáng
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div><strong>Tự nhập hàng</strong><p className="muted" style={{ margin: '4px 0 0' }}>Tự đặt mua theo tồn kho mỗi sáng. Chức năng này đang {autoBuyConfig.enabled ? 'bật' : 'tắt'}; khác với nhân viên bày hàng từ kho.</p></div>
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
              Phân tích tốc độ bán 3–7 ngày, tồn kho &amp; đơn chờ. Chia tiền theo tỷ lệ bên dưới (hàng đang bán / hàng mới nhập thử), luôn chừa quỹ dự phòng và không vượt tiền đang có.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px', fontSize: '11px' }}>
              <label title="% ngân sách cho hàng đang bán; phần còn lại nhập thử hàng mới">
                Hàng đang bán{' '}
                <input type="number" min={0} max={100} value={suggestDraft.provenSharePct} style={{ ...SUGGEST_INPUT_STYLE, width: 52 }} aria-label="Phần trăm ngân sách cho hàng đang bán"
                  onChange={(e) => setDraftField('provenSharePct', e.target.value)} />% · mới {100 - suggestOptions.provenSharePct}%
              </label>
              <label title="Số mặt hàng mới nhập thử tối đa mỗi lần gợi ý">
                Món mới tối đa{' '}
                <input type="number" min={0} max={20} value={suggestDraft.maxTrialProducts} style={{ ...SUGGEST_INPUT_STYLE, width: 46 }} aria-label="Số món mới nhập thử tối đa"
                  onChange={(e) => setDraftField('maxTrialProducts', e.target.value)} />
              </label>
              <label title="% tiền mặt giữ lại cho lương/thuế, không đưa vào gợi ý">
                Giữ lại quỹ{' '}
                <input type="number" min={0} max={90} value={suggestDraft.cashReservePct} style={{ ...SUGGEST_INPUT_STYLE, width: 52 }} aria-label="Phần trăm tiền mặt giữ lại"
                  onChange={(e) => setDraftField('cashReservePct', e.target.value)} />%
              </label>
              <button type="button" className="pixel-btn" disabled={!draftDirty} onClick={commitSuggestDraft}
                style={{ fontSize: '11px', padding: '2px 8px' }} aria-label="Lưu thông số gợi ý">
                {draftDirty ? 'Lưu thông số' : 'Đã lưu ✓'}
              </button>
              <label title="Giữ đủ tiền trả nợ lương, lương kỳ tới và thuế sắp nộp (lấy mức lớn hơn giữa khoản này và % bên trên)">
                <input type="checkbox" checked={suggestOptions.protectObligations} aria-label="Chừa tiền lương và thuế"
                  onChange={(e) => saveSuggestOptions({ ...suggestOptions, protectObligations: e.target.checked })} />{' '}
                Chừa tiền lương &amp; thuế
              </label>
            </div>
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
          ref={suggestionRef}
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
              Tiền dùng cho gợi ý {money(suggestedCart.budget.spendable)}{suggestedCart.budget.reserved > 0 ? ` (giữ lại ${money(suggestedCart.budget.reserved)}${suggestedCart.budget.obligations ? ' cho lương/thuế' : ''})` : ''} · Hàng đang bán {money(suggestedCart.budget.provenSpent)} / {money(suggestedCart.budget.provenTarget)} ({Math.round(suggestedCart.budget.provenShare * 100)}%) · Hàng mới thử {money(suggestedCart.budget.trialSpent)} / {money(suggestedCart.budget.trialTarget)} ({100 - Math.round(suggestedCart.budget.provenShare * 100)}%)
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
                          Tiệm còn {shopStock} món · NCC còn {maxQty >= 99 ? '∞' : maxQty} món · Gợi ý {item.quantity} món ({prod?.caseSize ? `${Math.ceil(item.quantity / prod.caseSize)} thùng` : 'món lẻ'}) · Tối đa {maxQty} món
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
              personal_care: '🧴',
              frozen: '🧊',
              fresh_produce: '🥬',
              health: '💊',
              toys_stationery: '🧸',
              alcohol: '🍺',
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


      {/* Chọn số thùng theo quy cách; tồn kho sau nhận vẫn tính bằng món lẻ. */}
      {filteredProducts.length === 0 ? (
        <EmptyState title="Không tìm thấy mặt hàng" icon="bag">
          Không có sản phẩm nào khớp với tìm kiếm hoặc bộ lọc nhóm hàng hiện tại.
        </EmptyState>
      ) : (
        filteredProducts.map((product) => {
          const quantity = quantities[product.id] ?? 0;
          const quote = board?.quotes[product.id];
          const unitPrice = getUnitPrice
            ? getUnitPrice(selectedSupplierId, product.id, Math.max(1, quantity))
            : Math.round(product.purchasePrice * (1 - discountRate));
          return (
            <LazyRow key={product.id}>
            <SupplierProductRow
              product={product}
              quantity={quantity}
              unitPrice={product.caseSize ? Math.round(estimateCartCost([{ productId: product.id, quantity: product.caseSize }]) / product.caseSize) : unitPrice}
              locked={product.unlockLevel > player.level}
              discountRate={discountRate}
              supplierName={currentSupplier.name}
              maxQty={maxQtyFor(product.id)}
              changePct={quote?.changePct}
              reasonsText={quote?.reasons.join('; ')}
              stockLeft={quote?.stockLeft}
              unavailable={quote?.unavailable}
              onSetQty={setCartQty}
            />
            </LazyRow>
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
                  {cartItems.map((it) => `${it.product.name} ×${it.packs} ${it.product.caseSize ? 'thùng' : 'món'} (${it.qty} món)`).join(' · ')}
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
