import {
  ALL_PRODUCTS,
  PRODUCT_MAP,
  SUPPLIER_MAP,
  DEFAULT_SUPPLIER_ID,
  effectiveShelfCapacity,
} from '@game/data';
import {
  COLD_WAREHOUSE_CAPACITY,
  DailyRecord,
  HoldingItem,
  InventoryItem,
  RestockSuggestionResult,
  StoreFixture,
  CashObligations,
  RestockSuggestionOptions,
  SuggestedCartItem,
  SuggestionReason,
  SupplierCartItem,
  SupplierOrder,
  isSalesFixture,
} from '@game/shared';
import { unitsFittingInCells, warehouseCellsFor } from './store-layout';

export interface SuggestionEngineParams {
  supplierId?: string;
  playerLevel: number;
  playerMoney: number;
  currentDay: number;
  fixtures: StoreFixture[];
  shelfCapacityBonus?: number;
  inventory: InventoryItem[];
  holdingArea: HoldingItem[];
  pendingOrders: SupplierOrder[];
  dailyRecords: Record<number, DailyRecord>;
  currentDayRecord: DailyRecord;
  coldWarehouseCount: number;
  budget?: number;
  unitPriceOf?: (productId: string) => number; // đơn giá thực (giá sỉ động); thiếu = giá chuẩn × (1 − chiết khấu)
  maxColdCapacity?: number;
  topNBestSellers?: number;
  /** Nhu cầu dự kiến (đơn vị/ngày) từ bảng lập kế hoạch; thiếu hoặc undefined = dùng vận tốc bán như cũ. */
  expectedDailyOf?: (productId: string) => number | undefined;
  /** Hệ số nhu cầu theo thời tiết & mùa (hoặc tổng hệ số thị trường). Mặc định 1.0 */
  demandMultiplierOf?: (productId: string) => number;
  /** Giỏ đang soạn (productId → số lượng): tính như hàng sắp về và đã giữ tiền, để bấm gợi ý nhiều lần không cộng dồn vượt tiền. */
  existingCart?: Record<string, number>;
  /** Tuỳ chỉnh tỷ lệ chia, số món thử và quỹ dự phòng; thiếu = mặc định. */
  options?: RestockSuggestionOptions;
  /** Nợ lương, lương kỳ tới và thuế sắp nộp; giữ lại nếu `options.protectObligations` không tắt. */
  obligations?: CashObligations;
  /** Tổng tiền thật phải trả cho một giỏ (giá sỉ theo bậc số lượng, chiết khấu NCC); dùng để kiểm tra cuối không vượt tiền. */
  cartCostOf?: (items: SupplierCartItem[]) => number;
  /** Tồn còn bán hôm nay của NCC; 0 = tạm ngừng cung, undefined = không giới hạn. */
  supplierStockOf?: (productId: string) => number | undefined;
  /** Kho thường: số ô trống và số đơn vị món đang giữ trong kho (giống kiểm tra khi đặt giỏ). Thiếu = không giới hạn. */
  ambient?: { freeCells: number; heldOf: (productId: string) => number };
  /** Nguyên liệu quầy ăn uống đã mở cần mỗi ngày (đơn vị/ngày); > 0 = luôn ưu tiên giữ đủ tồn trong kho, kể cả chưa từng bán ở kệ. */
  stallNeedOf?: (productId: string) => number;
}

/**
 * Calculate sales velocity (average units sold per day) for a product over the last N days.
 */
export function calculateSalesVelocity(
  productId: string,
  dailyRecords: Record<number, DailyRecord>,
  currentDayRecord: DailyRecord,
  days = 7
): { velocity: number; totalSold: number; daysCount: number } {
  let totalSold = 0;
  let daysCount = 0;

  // 1. Check past closed days in range [currentDay - days, currentDay - 1]
  const currentDay = currentDayRecord.day;
  const startDay = Math.max(1, currentDay - days);

  for (let d = startDay; d < currentDay; d++) {
    const rec = dailyRecords[d];
    if (rec) {
      daysCount++;
      const sold = rec.productSales?.[productId] ?? 0;
      totalSold += sold;
    }
  }

  // 2. Include today's sales if any
  const todaySold = currentDayRecord.productSales?.[productId] ?? 0;
  if (todaySold > 0 || daysCount === 0) {
    daysCount++;
    totalSold += todaySold;
  }

  const effectiveDays = Math.max(1, daysCount);
  const velocity = Number((totalSold / effectiveDays).toFixed(2));
  return { velocity, totalSold, daysCount: effectiveDays };
}

/**
 * Calculate usable stock of a product across fixtures, warehouse inventory, and holding area.
 * Lots expiring on or before currentDay are excluded as spoiled.
 */
export function getUsableStock(
  productId: string,
  currentDay: number,
  fixtures: StoreFixture[],
  inventory: InventoryItem[],
  holdingArea: HoldingItem[]
): number {
  let count = 0;

  // Fixtures
  for (const f of fixtures) {
    if (isSalesFixture(f) && f.assignedProductId === productId) {
      if (f.stockLots && f.stockLots.length > 0) {
        for (const lot of f.stockLots) {
          if (lot.expiresOnDay > currentDay) {
            count += lot.quantity;
          }
        }
      } else {
        count += f.currentStock;
      }
    }
  }

  // Warehouse inventory
  const inv = inventory.find((i) => i.productId === productId);
  if (inv) {
    if (inv.lots && inv.lots.length > 0) {
      for (const lot of inv.lots) {
        if (lot.expiresOnDay > currentDay) {
          count += lot.quantity;
        }
      }
    } else {
      count += inv.quantity;
    }
  }

  // Holding area
  for (const h of holdingArea) {
    if (h.productId === productId && h.expiresOnDay > currentDay) {
      count += h.quantity;
    }
  }

  return count;
}

/**
 * Calculate incoming orders for a product that have not yet been delivered.
 */
export function getIncomingOrdersCount(
  productId: string,
  pendingOrders: SupplierOrder[]
): number {
  return pendingOrders
    .filter((order) => !order.delivered && order.productId === productId)
    .reduce((sum, order) => sum + order.quantity, 0);
}


/** Tỷ lệ ngân sách gợi ý dành cho hàng đang bán; phần còn lại dành cho hàng mới nhập thử. */
export const PROVEN_BUDGET_SHARE = 0.4;
/** Tiền mặt giữ lại mặc định (10%) cho lương/thuế, không đưa vào gợi ý. */
export const DEFAULT_CASH_RESERVE_PCT = 10;
/** Dưới mức này (món/ngày) coi là bán chậm: chỉ nhập theo tốc độ bán thật, không lấp đầy kệ. */
export const SLOW_SELLER_VELOCITY = 0.5;
/** Tồn (kể cả đơn đang về và giỏ đang có) đủ bán quá số ngày này thì không nhập thêm để lấp kệ. */
export const MAX_COVER_DAYS = 5;
/** Số mặt hàng mới tối đa đưa vào thử trong một lần gợi ý (tránh tràn kho/kệ khi danh mục lớn). */
export const MAX_TRIAL_PRODUCTS = 6;
/** Lượt đầu mỗi món thử chỉ lấy chừng này đơn vị để tiền chia đều cho nhiều mẫu mã trước khi nhập thêm. */
export const TRIAL_FIRST_PASS_UNITS = 2;
/** Số ngày lịch sử tìm xem món đã từng bán chưa: có bán trong khoảng này thì không coi là hàng mới. */
export const HISTORY_DAYS = 60;

/** Đưa cài đặt người chơi (có thể thiếu/rác từ save hay ô nhập) về giá trị hợp lệ đầy đủ; dùng chung cho engine, save và giao diện. */
export function normalizeRestockOptions(options?: RestockSuggestionOptions | null): Required<RestockSuggestionOptions> {
  const num = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
  return {
    provenSharePct: num(options?.provenSharePct, PROVEN_BUDGET_SHARE * 100, 0, 100),
    maxTrialProducts: num(options?.maxTrialProducts, MAX_TRIAL_PRODUCTS, 0, 20),
    cashReservePct: num(options?.cashReservePct, DEFAULT_CASH_RESERVE_PCT, 0, 90),
    protectObligations: typeof options?.protectObligations === 'boolean' ? options.protectObligations : true,
  };
}

type SuggestionGroup = 'proven' | 'trial';
type LimitKind = 'budget' | 'cold' | 'ambient' | 'supplier';

const LIMIT_LABELS: Record<LimitKind, string> = {
  budget: 'theo ngân sách',
  cold: 'do giới hạn kho lạnh',
  ambient: 'do kho thường hết chỗ',
  supplier: 'do nhà cung cấp chỉ còn ít hàng',
};

interface CandidateItem {
  productId: string;
  group: SuggestionGroup;
  wantQuantity: number;
  unitPrice: number;
  reason: SuggestionReason;
  salesVelocity?: number;
  daysOfStockLeft?: number;
  storageType: 'ambient' | 'cold';
  /** Thứ tự trong nhóm: hàng đang bán theo tốc độ bán, hàng mới theo độ phổ biến (kệ trống sẵn được ưu tiên). */
  score: number;
  /** Nguyên liệu cho quầy ăn uống: xếp trước mọi món khác. */
  forStall?: boolean;
}

const formatMoney = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;

/**
 * Generate intelligent restock suggestions.
 *
 * Chia hai nhóm: hàng đang bán (có bán trong 7 ngày) nhận `PROVEN_BUDGET_SHARE` (40%) ngân sách,
 * hàng mới chưa bán và đang hết hàng nhận phần còn lại (60%) để nhập thử. Hàng bán chậm/tồn nhiều
 * bị giảm lượng; hàng chưa bán nhưng còn tồn thì chờ kết quả, không nhập thêm. Nhóm nào không dùng
 * hết phần của mình thì phần dư chuyển sang nhóm kia. Tổng giỏ (kể cả giỏ đang có) không vượt tiền mặt.
 */
export function generateRestockSuggestions(
  params: SuggestionEngineParams
): RestockSuggestionResult {
  const supplierId = params.supplierId ?? DEFAULT_SUPPLIER_ID;
  const supplier = SUPPLIER_MAP[supplierId];

  if (!supplier) {
    return {
      supplierId,
      items: [],
      totalCost: 0,
      totalQuantity: 0,
      coldItemCount: 0,
      appliedConstraints: ['Nhà cung cấp không tồn tại'],
      explanation: 'Không tìm thấy nhà cung cấp đã chọn.',
    };
  }

  if (supplier.unlockLevel > params.playerLevel) {
    return {
      supplierId,
      items: [],
      totalCost: 0,
      totalQuantity: 0,
      coldItemCount: 0,
      appliedConstraints: [`Nhà cung cấp ${supplier.name} mở khóa ở cấp ${supplier.unlockLevel}`],
      explanation: `Cần đạt cấp ${supplier.unlockLevel} để nhập hàng từ ${supplier.name}.`,
    };
  }

  const appliedConstraints: string[] = [];
  const discount = supplier.discountRate ?? 0;
  const unitPriceOf = (productId: string) =>
    Math.max(1, params.unitPriceOf?.(productId) ?? Math.round(PRODUCT_MAP[productId]!.purchasePrice * (1 - discount)));

  // ===== Giỏ đang có: coi như hàng sắp về và đã giữ tiền =====
  const cartQty = new Map<string, number>();
  for (const [productId, qty] of Object.entries(params.existingCart ?? {})) {
    if (PRODUCT_MAP[productId] && Number.isSafeInteger(qty) && qty > 0) cartQty.set(productId, qty);
  }
  const costOf = (lines: SupplierCartItem[]): number =>
    lines.length === 0
      ? 0
      : params.cartCostOf?.(lines) ?? lines.reduce((sum, line) => sum + line.quantity * unitPriceOf(line.productId), 0);
  const cartLines = [...cartQty].map(([productId, quantity]) => ({ productId, quantity }));
  const cartCost = costOf(cartLines);

  const clampNum = (value: number | undefined, fallback: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value as number)) : fallback;
  const provenShare = clampNum(params.options?.provenSharePct, PROVEN_BUDGET_SHARE * 100, 0, 100) / 100;
  const maxTrialProducts = Math.round(clampNum(params.options?.maxTrialProducts, MAX_TRIAL_PRODUCTS, 0, 20));
  const reservePct = clampNum(params.options?.cashReservePct, DEFAULT_CASH_RESERVE_PCT, 0, 90);

  const money = Math.max(0, params.playerMoney);
  const percentReserve = Math.floor((money * reservePct) / 100);
  const obligationReserve = params.options?.protectObligations === false ? 0 : Math.max(0, Math.floor(params.obligations?.total ?? 0));
  const reserved = Math.min(money, Math.max(percentReserve, obligationReserve));
  let moneyCap = Math.max(0, Math.min(params.budget ?? money, money - reserved));
  if (reserved > 0) {
    const ob = params.obligations;
    if (obligationReserve > percentReserve && ob) {
      const parts = [
        ob.wageDebt > 0 ? `nợ lương ${formatMoney(ob.wageDebt)}` : '',
        ob.nextWages > 0 ? `lương kỳ tới ${formatMoney(ob.nextWages)}` : '',
        ob.taxDue > 0 ? `thuế sắp nộp ${formatMoney(ob.taxDue)}` : '',
        ob.taxDebt > 0 ? `nợ thuế ${formatMoney(ob.taxDebt)}` : '',
      ].filter(Boolean);
      appliedConstraints.push(`Giữ lại ${formatMoney(reserved)} cho ${parts.join(' + ')}`);
    } else {
      appliedConstraints.push(`Giữ lại ${formatMoney(reserved)} (${Math.round(reservePct)}% tiền mặt) làm quỹ dự phòng`);
    }
  }
  const spendable = Math.max(0, moneyCap - cartCost);
  if (cartCost > 0) {
    appliedConstraints.push(`Giỏ đang có ${formatMoney(cartCost)} — chỉ gợi ý thêm trong ${formatMoney(spendable)} còn lại`);
  }

  // ===== Sức chứa còn lại (trừ đơn đang về và giỏ đang có) =====
  const maxColdCapacity = params.maxColdCapacity ?? COLD_WAREHOUSE_CAPACITY;
  const pendingColdCount = params.pendingOrders
    .filter((order) => !order.delivered && PRODUCT_MAP[order.productId]?.storageType === 'cold')
    .reduce((sum, order) => sum + order.quantity, 0);
  const cartColdCount = cartLines
    .filter((line) => PRODUCT_MAP[line.productId]!.storageType === 'cold')
    .reduce((sum, line) => sum + line.quantity, 0);
  let availableCold = Math.max(0, maxColdCapacity - params.coldWarehouseCount - pendingColdCount - cartColdCount);

  const ambient = params.ambient;
  const ambientHeld = (productId: string) => (ambient?.heldOf(productId) ?? 0) + (cartQty.get(productId) ?? 0);
  let ambientFree = ambient?.freeCells ?? Infinity;
  if (ambient) {
    for (const line of cartLines) {
      const product = PRODUCT_MAP[line.productId]!;
      if (product.storageType === 'cold') continue;
      const held = ambient.heldOf(line.productId);
      ambientFree -= warehouseCellsFor(product, held + line.quantity) - warehouseCellsFor(product, held);
    }
    ambientFree = Math.max(0, ambientFree);
  }

  const supplierRoom = (productId: string): number => {
    const stock = params.supplierStockOf?.(productId);
    return stock === undefined ? Infinity : Math.max(0, stock - (cartQty.get(productId) ?? 0));
  };

  // ===== Phân loại & tính nhu cầu từng mặt hàng =====
  const proven: CandidateItem[] = [];
  const trials: CandidateItem[] = [];
  const reducedSlow: string[] = [];
  let waitingTrialCount = 0;

  const availableProducts = ALL_PRODUCTS.filter((p) => p.unlockLevel <= params.playerLevel);

  for (const product of availableProducts) {
    if (supplierRoom(product.id) <= 0) continue; // NCC tạm ngừng cung / hết hàng hôm nay

    const usableStock = getUsableStock(
      product.id,
      params.currentDay,
      params.fixtures,
      params.inventory,
      params.holdingArea
    );
    const incoming = getIncomingOrdersCount(product.id, params.pendingOrders) + (cartQty.get(product.id) ?? 0);
    const stallNeed = Math.max(0, params.stallNeedOf?.(product.id) ?? 0);
    // Quầy ăn uống lấy nguyên liệu từ kho nên chỉ tính tồn kho + hàng đang về.
    const effectiveStock = stallNeed > 0 && params.ambient ? params.ambient.heldOf(product.id) + incoming : usableStock + incoming;

    // Sales velocity: 7 days & 3 days
    const v7 = calculateSalesVelocity(product.id, params.dailyRecords, params.currentDayRecord, 7);
    const v3 = calculateSalesVelocity(product.id, params.dailyRecords, params.currentDayRecord, 3);
    const soldRecently = v7.totalSold > 0 || (params.currentDayRecord.productSales?.[product.id] ?? 0) > 0;
    // Món từng bán trước đây (xa hơn 7 ngày) vẫn là hàng đã có lịch sử, không phải hàng mới: nhập theo tốc độ bán cũ.
    const lifetime = soldRecently ? undefined : calculateSalesVelocity(product.id, params.dailyRecords, params.currentDayRecord, HISTORY_DAYS);
    const soldBefore = (lifetime?.totalSold ?? 0) > 0;
    const hadSales = soldRecently || soldBefore || stallNeed > 0;
    const demandMultiplier = Math.max(0.1, Math.min(4.0, params.demandMultiplierOf?.(product.id) ?? 1.0));
    const baseVelocity = soldBefore ? lifetime!.velocity : Math.max(v7.velocity, v3.velocity);
    const trendVelocity = Math.max(stallNeed, (soldRecently ? params.expectedDailyOf?.(product.id) : undefined) ?? (baseVelocity * demandMultiplier));

    const assignedFixture = params.fixtures.find(
      (f) => isSalesFixture(f) && f.assignedProductId === product.id
    );
    const shelfCap = assignedFixture
      ? effectiveShelfCapacity(assignedFixture.maxCapacity, product.shelfCapacity, params.shelfCapacityBonus ?? 0)
      : undefined;
    const daysToSpoil = product.expirationRules?.daysToSpoil ?? 99;
    const unitPrice = unitPriceOf(product.id);

    if (hadSales) {
      // Hàng đang bán: đủ 2.5 ngày bán; lấp kệ nhưng không vượt MAX_COVER_DAYS ngày bán để hàng chậm không bị nhập tràn.
      const slow = trendVelocity < SLOW_SELLER_VELOCITY;
      let target = Math.ceil(trendVelocity * 2.5);
      if (stallNeed > 0) target = Math.max(target, Math.ceil(stallNeed * 3));
      if (shelfCap !== undefined && stallNeed <= 0) {
        target = Math.max(target, Math.min(shelfCap, Math.ceil(trendVelocity * MAX_COVER_DAYS)));
      }
      // Perishable constraint: fresh items must not exceed shelf life
      if (daysToSpoil <= 7) {
        target = Math.min(target, Math.max(2, Math.ceil(Math.max(trendVelocity, 1) * daysToSpoil)));
      }

      let wantQuantity = Math.max(0, target - effectiveStock);
      if (product.caseSize) wantQuantity = Math.ceil(wantQuantity / product.caseSize) * product.caseSize;
      if (wantQuantity <= 0) {
        if (effectiveStock > 0 && (slow || effectiveStock >= trendVelocity * MAX_COVER_DAYS)) reducedSlow.push(product.name);
        continue;
      }
      if (slow) reducedSlow.push(product.name);
      proven.push({
        productId: product.id,
        group: 'proven',
        wantQuantity,
        unitPrice,
        forStall: stallNeed > 0 || undefined,
        reason: effectiveStock === 0 || (stallNeed > 0 && effectiveStock < stallNeed) ? 'out_of_stock' : slow ? 'slow_seller' : trendVelocity >= 2 ? 'best_seller' : 'low_stock',
        salesVelocity: trendVelocity,
        daysOfStockLeft: trendVelocity > 0 ? Number((effectiveStock / trendVelocity).toFixed(1)) : effectiveStock > 0 ? 99 : 0,
        storageType: product.storageType,
        score: trendVelocity,
      });
    } else {
      // Chưa bán mà vẫn còn hàng (kệ/kho/đơn đang về): đang thử, chờ kết quả — không nhập thêm.
      if (effectiveStock > 0) {
        waitingTrialCount++;
        continue;
      }
    // Hàng mới: nhập thử lượng nhỏ theo độ phổ biến × hệ số mùa/thời tiết;
    // đủ ít nhất một kiện để có thể bày bán sau khi mở thùng.
      const basePop = product.demandProfile?.basePopularity ?? 0.5;
      let target = Math.max(product.caseSize ?? 2, Math.round(basePop * 5 * demandMultiplier));
      if (shelfCap !== undefined) target = Math.min(target, shelfCap);
      if (daysToSpoil <= 7) target = Math.min(target, Math.max(2, daysToSpoil));
      if (target <= 0) continue;
      trials.push({
        productId: product.id,
        group: 'trial',
        wantQuantity: target,
        unitPrice,
        reason: 'fallback_trial',
        daysOfStockLeft: 0,
        storageType: product.storageType,
        score: basePop * demandMultiplier + (shelfCap !== undefined ? 10 : 0),
      });
    }
  }

  const priorityOrder: Record<SuggestionReason, number> = {
    out_of_stock: 1,
    low_stock: 2,
    best_seller: 3,
    slow_seller: 4,
    fallback_trial: 5,
  };
  proven.sort((a, b) => Number(!!b.forStall) - Number(!!a.forStall) || priorityOrder[a.reason] - priorityOrder[b.reason] || b.score - a.score || a.unitPrice - b.unitPrice);
  trials.sort((a, b) => b.score - a.score || a.unitPrice - b.unitPrice);

  // ===== Phân bổ ngân sách 40/60 =====
  const provenTarget = Math.floor(spendable * provenShare);
  const pools: Record<SuggestionGroup, number> = { proven: provenTarget, trial: spendable - provenTarget };
  const picked = new Map<string, SuggestedCartItem>();
  const groupOf = new Map<string, SuggestionGroup>();
  const limits = new Map<string, Set<LimitKind>>();
  const selectedTrials: CandidateItem[] = [];

  const markLimit = (productId: string, kind: LimitKind) => {
    const set = limits.get(productId) ?? new Set<LimitKind>();
    set.add(kind);
    limits.set(productId, set);
  };

  /** Thêm tối đa `qty` đơn vị của `cand` (không vượt nhu cầu trừ khi `overWant`), trả về số thực thêm. */
  const take = (cand: CandidateItem, qty: number, pool: SuggestionGroup | 'shared', overWant = false): number => {
    const product = PRODUCT_MAP[cand.productId]!;
    const packSize = product.caseSize ?? 1;
    const already = picked.get(cand.productId)?.quantity ?? 0;
    let q = overWant ? qty : Math.min(qty, cand.wantQuantity - already);
    if (q <= 0) return 0;

    // Ngân sách gợi ý 40/60 là mục tiêu phân bổ; một kiện nguyên có thể vượt mục tiêu nhóm.
    const firstCaseCost = packSize * cand.unitPrice;
    const useSharedPool = pool === 'shared' || (already === 0 && packSize > 1 && pools[pool] < firstCaseCost && Math.max(pools.proven, pools.trial) >= firstCaseCost);

    const room = supplierRoom(cand.productId) - already;
    if (q > room) { markLimit(cand.productId, 'supplier'); q = Math.max(0, room); }
    if (cand.storageType === 'cold' && q > availableCold) { markLimit(cand.productId, 'cold'); q = availableCold; }
    if (cand.storageType !== 'cold' && ambient) {
      const fit = unitsFittingInCells(product, ambientHeld(cand.productId) + already, ambientFree, q);
      if (fit < q) { markLimit(cand.productId, 'ambient'); q = fit; }
    }
    // A full case may exceed the current pool by less than one case; let the candidate
    // use the combined remaining budget when that is the only way to order a full pack.
    const budgetLeft = useSharedPool ? pools.proven + pools.trial : pools[pool];
    const affordable = Math.floor(budgetLeft / cand.unitPrice);
    if (q > affordable) { markLimit(cand.productId, 'budget'); q = affordable; }
    // Các mặt hàng có quy cách chỉ được gợi ý theo kiện nguyên, đúng như thao tác nhập tay.
    q = Math.floor(q / packSize) * packSize;
    if (q <= 0) return 0;

    const cost = q * cand.unitPrice;
    if (useSharedPool) {
      const useOther = useSharedPool && pool !== 'shared';
      const fundingPool = useOther ? (pools.proven >= pools.trial ? 'proven' : 'trial') : pool;
      const fromProven = fundingPool === 'shared' || fundingPool === 'proven' ? Math.min(pools.proven, cost) : 0;
      pools.proven -= fromProven;
      const fromTrial = fundingPool === 'shared' || fundingPool === 'trial' ? Math.min(pools.trial, cost - fromProven) : Math.max(0, cost - fromProven);
      pools.trial -= fromTrial;
    } else {
      pools[pool] -= cost;
    }
    if (cand.storageType === 'cold') availableCold -= q;
    else if (ambient) {
      const held = ambientHeld(cand.productId) + already;
      ambientFree -= warehouseCellsFor(product, held + q) - warehouseCellsFor(product, held);
    }

    const item = picked.get(cand.productId);
    if (item) {
      item.quantity += q;
      item.estimatedCost += cost;
    } else {
      picked.set(cand.productId, {
        productId: cand.productId,
        quantity: q,
        unitPrice: cand.unitPrice,
        estimatedCost: cost,
        reason: cand.reason,
        salesVelocity: cand.salesVelocity,
        isFallback: cand.group === 'trial',
        daysOfStockLeft: cand.daysOfStockLeft,
      });
      groupOf.set(cand.productId, cand.group);
    }
    return q;
  };

  /**
   * Mở thêm mặt hàng mới (mỗi món lượt đầu tối đa TRIAL_FIRST_PASS_UNITS) cho tới MAX_TRIAL_PRODUCTS món.
   * Vòng đầu mỗi ngành hàng chưa có món thử chỉ lấy một món để đa dạng mẫu mã, vòng sau lấp chỗ còn lại.
   */
  const openTrials = (pool: SuggestionGroup | 'shared') => {
    const categoryOf = (cand: CandidateItem) => PRODUCT_MAP[cand.productId]!.category;
    for (const diverseOnly of [true, false]) {
      const usedCategories = new Set(selectedTrials.map(categoryOf));
      for (const cand of trials) {
        if (selectedTrials.length >= maxTrialProducts) return;
        if (picked.has(cand.productId)) continue;
        if (diverseOnly && usedCategories.has(categoryOf(cand))) continue;
        if (take(cand, TRIAL_FIRST_PASS_UNITS, pool) > 0) {
          selectedTrials.push(cand);
          usedCategories.add(categoryOf(cand));
        }
      }
    }
  };

  // 0) Nguyên liệu quầy ăn uống: lấy trước từ cả hai phần ngân sách; thiếu tiền thì được dùng thêm phần quỹ dự phòng
  // (không chạm khoản nợ lương/thuế đã đến hạn trả) để quầy đã mở không phải dừng vì thiếu hàng.
  const stallCands = proven.filter((c) => c.forStall);
  if (stallCands.length > 0) {
    const stallWant = stallCands.reduce((sum, c) => sum + c.wantQuantity * c.unitPrice, 0);
    const dueNow = Math.min(money, Math.max(params.obligations?.wageDebt ?? 0, 0) + Math.max(params.obligations?.taxDebt ?? 0, 0));
    const reservable = Math.max(0, Math.min(reserved, money - dueNow - cartCost - spendable));
    const boost = Math.min(reservable, Math.max(0, stallWant - spendable));
    if (boost > 0) {
      pools.proven += boost;
      const before = pools.proven + pools.trial;
      for (const cand of stallCands) take(cand, cand.wantQuantity, 'shared');
      const spent = before - (pools.proven + pools.trial);
      const used = Math.min(boost, Math.max(0, spent - spendable));
      let unused = boost - used;
      const fromProven = Math.min(pools.proven, unused);
      pools.proven -= fromProven;
      unused -= fromProven;
      pools.trial = Math.max(0, pools.trial - unused);
      moneyCap += used;
      if (used > 0) appliedConstraints.push(`Dùng ${formatMoney(used)} từ quỹ dự phòng để nhập nguyên liệu cho quầy ăn uống`);
    } else {
      for (const cand of stallCands) take(cand, cand.wantQuantity, 'shared');
    }
  }
  // 1) Hàng đang bán trong phần 40%.
  for (const cand of proven) take(cand, cand.wantQuantity, 'proven');
  // 2) Hàng mới trong phần 60%: chia đều cho nhiều mẫu mã trước, sau đó nhập đủ lượng thử.
  openTrials('trial');
  for (const cand of selectedTrials) take(cand, cand.wantQuantity, 'trial');
  // 3) Phần dư của nhóm này bù cho nhóm kia.
  for (const cand of proven) take(cand, cand.wantQuantity, 'shared');
  openTrials('shared');
  for (const cand of selectedTrials) take(cand, cand.wantQuantity, 'shared');

  const orderedItems = () => [...picked.values()];
  const mergedWithCart = (): SupplierCartItem[] => {
    const merged = new Map(cartQty);
    for (const item of picked.values()) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  };

  // ===== Đơn tối thiểu của nhà cung cấp (tính cả giỏ đang có) =====
  if (supplier.minOrderValue && picked.size > 0) {
    let orderTotal = costOf(mergedWithCart());
    if (orderTotal < supplier.minOrderValue && moneyCap >= supplier.minOrderValue) {
      const all = [...proven, ...selectedTrials];
      for (const cand of all) {
        if (!picked.has(cand.productId)) continue;
        const deficit = supplier.minOrderValue - orderTotal;
        if (deficit <= 0) break;
        if (take(cand, Math.ceil(deficit / cand.unitPrice), 'shared', true) > 0) orderTotal = costOf(mergedWithCart());
      }
    }
  }

  // ===== Kiểm tra cuối theo giá thật: tổng giỏ (giỏ đang có + gợi ý) không được vượt tiền =====
  let trimmed = false;
  if (params.cartCostOf) {
    let total = costOf(mergedWithCart());
    while (total > moneyCap && picked.size > 0) {
      const last = orderedItems()[picked.size - 1]!;
      last.quantity -= 1;
      last.estimatedCost = last.quantity * last.unitPrice;
      if (last.quantity <= 0) picked.delete(last.productId);
      total = costOf(mergedWithCart());
      trimmed = true;
    }
  }
  if (trimmed) appliedConstraints.push('Giảm bớt số lượng cuối giỏ để tổng tiền theo giá thật không vượt tiền đang có');

  const items = orderedItems();
  for (const cand of [...proven, ...trials]) {
    const kinds = limits.get(cand.productId);
    if (!kinds) continue;
    const got = picked.get(cand.productId)?.quantity ?? 0;
    if (got >= cand.wantQuantity) continue;
    const name = PRODUCT_MAP[cand.productId]!.name;
    const why = [...kinds].map((kind) => LIMIT_LABELS[kind]).join(', ');
    if (got > 0) appliedConstraints.push(`Cắt giảm ${name} từ ${cand.wantQuantity} xuống ${got} ${why}`);
    else if (cand.group === 'proven' || selectedTrials.includes(cand)) appliedConstraints.push(`Bỏ qua ${name} ${why}`);
  }
  if ([...limits.values()].some((kinds) => kinds.has('budget')) && items.length < proven.length + Math.min(trials.length, maxTrialProducts)) {
    appliedConstraints.push('Dừng gợi ý thêm sản phẩm do không đủ ngân sách');
  }
  const untriedCount = trials.filter((cand) => !picked.has(cand.productId)).length;
  if (untriedCount > 0 && selectedTrials.length >= maxTrialProducts) {
    appliedConstraints.push(`Còn ${untriedCount} mặt hàng mới chưa nhập thử — để các lần gợi ý sau (mỗi lần tối đa ${maxTrialProducts} món)`);
  }

  const totalCost = costOf(items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const coldItemCount = items
    .filter((item) => PRODUCT_MAP[item.productId]?.storageType === 'cold')
    .reduce((sum, item) => sum + item.quantity, 0);
  const spentOf = (group: SuggestionGroup) =>
    items.filter((item) => groupOf.get(item.productId) === group).reduce((sum, item) => sum + item.estimatedCost, 0);
  const budget = {
    spendable,
    provenShare,
    reserved,
    obligations: obligationReserve,
    provenTarget,
    trialTarget: spendable - provenTarget,
    provenSpent: spentOf('proven'),
    trialSpent: spentOf('trial'),
  };

  if (supplier.minOrderValue && items.length > 0) {
    const orderTotal = costOf(mergedWithCart());
    if (orderTotal < supplier.minOrderValue) {
      appliedConstraints.push(
        `Đơn hàng (${formatMoney(orderTotal)}) chưa đạt đơn tối thiểu (${formatMoney(supplier.minOrderValue)}) của ${supplier.name}`
      );
    }
  }

  let explanation: string;
  if (items.length === 0) {
    explanation = spendable <= 0
      ? cartCost > 0
        ? 'Giỏ đang có đã dùng hết số tiền hiện có — không gợi ý thêm.'
        : 'Không còn tiền để nhập hàng.'
      : 'Tồn kho hiện tại và các đơn đang giao đã đủ đáp ứng nhu cầu dự kiến.';
  } else {
    explanation = `Gợi ý ${items.length} mặt hàng (${totalQuantity} sản phẩm) từ ${supplier.name} với tổng chi phí ${formatMoney(totalCost)} (tiền đang có ${formatMoney(money)}).`;
    explanation += ` Phân bổ: hàng đang bán ${formatMoney(budget.provenSpent)} · hàng mới nhập thử nghiệm ${formatMoney(budget.trialSpent)} (mục tiêu ${Math.round(provenShare * 100)}/${Math.round((1 - provenShare) * 100)}; nhóm dùng không hết thì nhường cho nhóm kia).`;
    const stallCount = items.filter((item) => proven.some((c) => c.productId === item.productId && c.forStall)).length;
    if (stallCount > 0) explanation += ` Ưu tiên ${stallCount} nguyên liệu cho quầy ăn uống đã mở.`;
    if (reducedSlow.length > 0) {
      explanation += ` ${reducedSlow.length} mặt hàng bán chậm/tồn nhiều được giảm hoặc bỏ nhập.`;
    }
    if (waitingTrialCount > 0) {
      explanation += ` ${waitingTrialCount} mặt hàng đang thử chưa bán được nên chưa nhập thêm.`;
    }
  }

  return {
    supplierId,
    items,
    totalCost,
    totalQuantity,
    coldItemCount,
    appliedConstraints: Array.from(new Set(appliedConstraints)),
    explanation,
    budget,
  };
}
