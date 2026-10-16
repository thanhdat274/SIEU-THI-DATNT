/**
 * Logic sổ góp xóm — Civic Bundle Core (OpenSpec `civic-city-goals`, D3/D4/D5/D8).
 *
 * Bao gồm:
 * - Evaluator thuần cho điều kiện mục tiêu xóm phố (civic_building_count, district_qol_at_least, total_population_at_least)
 * - donate_to_bundle: kiểm hợp lệ, FIFO, over-donation, ledger, completion
 * - Kiểm tra điều kiện mở công trình civic
 *
 * Lưu ý: tất cả hàm đều THUẦN (không phụ thuộc server). Server gọi lại với context thêm.
 */

import { PRODUCT_MAP, CIVIC_BUNDLES, type CivicBundleDef } from '@game/data';
import type { LedgerEntry, InventoryItem, StockLot } from '@game/shared';
import { normalizeLots, sumLots, takeLots } from './stock';

type LedgerDraft = Omit<LedgerEntry, 'id' | 'timestamp'>;

/** Mã lý do góp/nhận mục tiêu → câu tiếng Việt (UI và server dùng chung). */
export const BUNDLE_REASON_MESSAGES: Readonly<Record<string, string>> = {
  bundle_not_found: 'Không tìm thấy trang sổ.',
  bundle_hidden: 'Trang sổ chưa hiện.',
  bundle_done: 'Trang này đã hoàn thành.',
  slot_not_found: 'Không tìm thấy ô góp.',
  slot_full: 'Ô này vừa được góp đủ.',
  retry: 'Sổ góp vừa có thay đổi từ người cùng hẻm. Hãy xem lại và thử lại.',
  product_required: 'Chọn món để góp.',
  wrong_product: 'Ô này không nhận món đó.',
  product_not_found: 'Món không tồn tại.',
  invalid_quantity: 'Số lượng không hợp lệ.',
  invalid_amount: 'Số tiền không hợp lệ.',
  not_enough_stock: 'Kho không đủ hàng còn hạn.',
  money: 'Không đủ tiền.',
  goal_not_found: 'Không tìm thấy mục tiêu.',
  already_claimed: 'Mục tiêu này đã nhận rồi.',
  wrong_level: 'Mục tiêu không thuộc cấp hiện tại.',
  goal_not_met: 'Chưa đạt điều kiện mục tiêu.',
};

export const bundleReasonMessage = (code: string | undefined): string | undefined => (code ? BUNDLE_REASON_MESSAGES[code] ?? code : undefined);

// ============ BUNDLE MIN SHELF DAYS ============
/** Lô góp phải còn hạn ≥ BUNDLE_MIN_SHELF_DAYS (chốt 16/10/2026). */
export const BUNDLE_MIN_SHELF_DAYS = 1;

/** Lô của món trong kho; save cũ chỉ có tổng số lượng thì dựng lô như `normalizeLots`. */
export function itemLots(item: InventoryItem, day: number): StockLot[] {
  return item.lots ?? normalizeLots(item.quantity, undefined, item.productId, day);
}

/**
 * Lấy hàng góp khỏi `lots` (mutate): FIFO theo hạn, bỏ qua lô còn hạn < BUNDLE_MIN_SHELF_DAYS.
 * Dùng chung cho kiểm tra (trên bản sao) và trừ kho thật → giá vốn luôn khớp lô bị trừ.
 */
export function takeDonationLots(lots: StockLot[], quantity: number, day: number, caseSize?: number): StockLot[] {
  const eligible = lots.filter((lot) => lot.expiresOnDay - day >= BUNDLE_MIN_SHELF_DAYS);
  const moved = takeLots(eligible, quantity, { caseSize });
  const kept = lots.filter((lot) => lot.expiresOnDay - day < BUNDLE_MIN_SHELF_DAYS);
  lots.splice(0, lots.length, ...kept, ...eligible);
  lots.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
  return moved;
}

// ============ EVALUATOR: điều kiện mục tiêu xóm phố ============

/** Loại điều kiện mục tiêu xóm phố. */
export type CivicGoalConditionKind =
  | 'civic_building_count'
  | 'district_qol_at_least'
  | 'total_population_at_least';

/** Định nghĩa điều kiện mục tiêu xóm phố (chèn trong CityGoalDef của city-goals.ts). */
export interface CivicGoalCondition {
  kind: CivicGoalConditionKind;
  targetValue: number;
  /** civicBuildingCount: buildingTypeId cần đếm. */
  buildingTypeId?: string;
  /** districtQolAtLeast: districtId cần QoL. */
  districtId?: string;
}

/**
 * Đánh giá điều kiện mục tiêu xóm phố từ dữ liệu simulation hiện tại.
 * Trả true nếu điều kiện đã đạt.
 */
export function evaluateCivicGoalCondition(
  condition: CivicGoalCondition,
  ctx: {
    /** Số lượng công trình công cộng đã đặt. */
    civicBuildings: Record<string, number>;
    /** QoL theo khu. */
    districtQol: Record<string, number>;
    /** Tổng dân số xóm. */
    totalPopulation: number;
  }
): boolean {
  switch (condition.kind) {
    case 'civic_building_count': {
      const typeId = condition.buildingTypeId ?? 'park';
      const count = ctx.civicBuildings[typeId] ?? 0;
      return count >= condition.targetValue;
    }
    case 'district_qol_at_least': {
      const did = condition.districtId ?? 'hem_dan_cu';
      const qol = ctx.districtQol[did] ?? 0;
      return qol >= condition.targetValue;
    }
    case 'total_population_at_least': {
      return ctx.totalPopulation >= condition.targetValue;
    }
  }
}

// ============ BUNDLE STATE (từ save) ============

/** Trạng thái một ô trong sổ góp. */
export interface BundleSlotState {
  /** Đã góp bao nhiêu (hàng: đơn vị, cash: đồng). */
  contributed: number;
}

/** Trạng thái ghi nhận đóng góp của người chơi. */
export interface ContributionRecord {
  playerId: string;
  slotId: string;
  qty: number;
  day: number;
  /** Giá trị góp (₫): tiền = số tiền, hàng = giá vốn FIFO. Save cũ thiếu → xem `bundleDonatedValue`. */
  value?: number;
}

/** Trạng thái một trang sổ góp (lưu trong save). */
export interface CivicBundleState {
  /** Đã góp mỗi ô. */
  slots: Record<string, number>;
  /** Ai đã góp ô nào. */
  contributions: ContributionRecord[];
  /** Ngày hoàn thành (undefined = chưa xong). */
  completedDay?: number;
}

/** Trạng thái civic.bundles trong save (dẫn xuất từ bundleDef + civicBundleState). */
export function bundleSlotsProgress(
  bundleDef: CivicBundleDef,
  bundleState: CivicBundleState | undefined
): Map<string, { current: number; target: number; completed: boolean }> {
  const result = new Map<string, { current: number; target: number; completed: boolean }>();
  const state = bundleState;
  for (const slot of bundleDef.slots) {
    if (slot.kind === 'cash') {
      const target = slot.amount ?? 0;
      const current = state?.slots[slot.id] ?? 0;
      result.set(slot.id, { current, target, completed: current >= target });
    } else {
      const target = slot.quantity ?? 0;
      const current = state?.slots[slot.id] ?? 0;
      result.set(slot.id, { current, target, completed: current >= target });
    }
  }
  return result;
}

/** Kiểm tra trang sổ đã hoàn thành. */
export function isBundleCompleted(bundleDef: CivicBundleDef, state: CivicBundleState | undefined): boolean {
  if (state?.completedDay) return true;
  for (const slot of bundleDef.slots) {
    const current = state?.slots[slot.id] ?? 0;
    const target = slot.kind === 'cash' ? (slot.amount ?? 0) : (slot.quantity ?? 0);
    if (current < target) return false;
  }
  return true;
}

// ============ DONATE_TO_BUNDLE ============

/** Kết quả donate_to_bundle. */
export interface DonateResult {
  success: boolean;
  reason?: string;
  /** Số lượng thực tế nhận được (hàng: qty, cash: amount). */
  actualQuantity?: number;
  /** Dòng sổ cái cần ghi (chưa có id) — simulation ghi qua `recordLedger` để id không trùng. */
  ledgerEntry?: LedgerDraft;
  /** Bundle state mới. */
  newState?: CivicBundleState;
  /** productId đã góp (goods). */
  productId?: string;
}

/**
 * Lệnh donate_to_bundle: góp hàng/tiền vào một ô của trang sổ.
 *
 * Kiểm tra:
 * - Bundle hiện ở cấp thành phố hiện tại hoặc thấp hơn (revealedByCityLevel ≤ cityLevel)
 * - Trang chưa hoàn thành
 * - Ô chưa đủ
 * - Sản phẩm hợp lệ (goods) hoặc số tiền dương (cash)
 * - Kho đủ hàng + lô còn hạn ≥ BUNDLE_MIN_SHELF_DAYS
 *
 * Góp vượt → chỉ nhận phần thiếu.
 * FIFO trừ kho (dùng hàm looseUnits + normalizeLots từ stock.ts).
 * Ledger ghi giá vốn + bundleId + slotId.
 * Contributions ghi playerId + slotId + qty + day.
 */
export function donateToBundle(
  bundleDef: CivicBundleDef,
  bundleState: CivicBundleState | undefined,
  slotId: string,
  productId: string | undefined,
  quantity: number | undefined,
  amount: number | undefined,
  cityLevel: number,
  inventory: InventoryItem[],
  playerMoney: number,
  playerId: string,
  day: number
): DonateResult {
  // 1. Kiểm tra bundle revealed
  if (bundleDef.revealedByCityLevel > cityLevel) {
    return { success: false, reason: 'bundle_hidden' };
  }

  // 2. Kiểm tra completed
  if (isBundleCompleted(bundleDef, bundleState)) {
    return { success: false, reason: 'bundle_done' };
  }

  // 3. Tìm slot
  const slot = bundleDef.slots.find((s) => s.id === slotId);
  if (!slot) {
    return { success: false, reason: 'slot_not_found' };
  }

  // 4. Kiểm tra slot kind
  if (slot.kind === 'goods') {
    if (!productId) {
      return { success: false, reason: 'product_required' };
    }
    if (!quantity || quantity <= 0 || !Number.isSafeInteger(quantity)) {
      return { success: false, reason: 'invalid_quantity' };
    }
    // Kiểm tra product trong acceptedProductIds
    if (!slot.acceptedProductIds?.includes(productId)) {
      return { success: false, reason: 'wrong_product' };
    }
    // Kiểm tra stock
    const productDef = PRODUCT_MAP[productId];
    if (!productDef) {
      return { success: false, reason: 'product_not_found' };
    }
    // Góp vượt: chỉ nhận phần thiếu
    const current = bundleState?.slots[slotId] ?? 0;
    const short = Math.max(0, (slot.quantity ?? 0) - current);
    if (short <= 0) {
      return { success: false, reason: 'slot_full' };
    }
    const wanted = Math.min(quantity, short);
    // Chỉ lô còn hạn ≥ BUNDLE_MIN_SHELF_DAYS được góp; lô sắp hỏng bị bỏ qua, không chặn cả lệnh.
    // Lấy thử trên bản sao bằng cùng hàm với lúc trừ kho thật → giá vốn khớp đúng lô bị trừ.
    const item = inventory.find((inv) => inv.productId === productId);
    const preview = takeDonationLots(structuredClone(item ? itemLots(item, day) : []), wanted, day, productDef.caseSize);
    const actualQty = sumLots(preview);
    if (actualQty < wanted) {
      return { success: false, reason: 'not_enough_stock' };
    }
    const totalCost = preview.reduce((sum, lot) => sum + lot.quantity * (lot.unitCost ?? productDef.purchasePrice), 0);
    const ledgerEntry: LedgerDraft = {
      day,
      type: 'civic_donation',
      amount: totalCost,
      cogs: totalCost,
      quantity: actualQty,
      productId,
      bundleId: bundleDef.id,
      slotId,
      description: `Góp ${actualQty} ${productDef.name} vào sổ góp ${bundleDef.id} (${slot.label})`,
    };
    // Update state
    const newState: CivicBundleState = {
      slots: { ...bundleState?.slots, [slotId]: (bundleState?.slots[slotId] ?? 0) + actualQty },
      contributions: [
        ...(bundleState?.contributions ?? []),
        { playerId, slotId, qty: actualQty, day, value: totalCost },
      ],
      completedDay: bundleState?.completedDay,
    };
    // Check if bundle completed
    if (isBundleCompleted(bundleDef, newState)) {
      newState.completedDay = day;
    }
    return {
      success: true,
      actualQuantity: actualQty,
      ledgerEntry,
      newState,
      productId,
    };
  } else {
    // Cash slot
    if (!amount || amount <= 0 || !Number.isSafeInteger(amount)) {
      return { success: false, reason: 'invalid_amount' };
    }
    // Góp vượt: chỉ nhận phần thiếu — cắt trước rồi mới so với tiền đang có.
    const current = bundleState?.slots[slotId] ?? 0;
    const short = Math.max(0, (slot.amount ?? 0) - current);
    const actualAmt = Math.min(amount, short);
    if (actualAmt <= 0) {
      return { success: false, reason: 'slot_full' };
    }
    if (playerMoney < actualAmt) {
      return { success: false, reason: 'money' };
    }
    const ledgerEntry: LedgerDraft = {
      day,
      type: 'civic_donation',
      amount: actualAmt,
      bundleId: bundleDef.id,
      slotId,
      description: `Góp ${actualAmt.toLocaleString('vi-VN')}₫ vào sổ góp ${bundleDef.id} (${slot.label})`,
    };
    const newState: CivicBundleState = {
      slots: { ...bundleState?.slots, [slotId]: (bundleState?.slots[slotId] ?? 0) + actualAmt },
      contributions: [
        ...(bundleState?.contributions ?? []),
        { playerId, slotId, qty: actualAmt, day, value: actualAmt },
      ],
      completedDay: bundleState?.completedDay,
    };
    if (isBundleCompleted(bundleDef, newState)) {
      newState.completedDay = day;
    }
    return {
      success: true,
      actualQuantity: actualAmt,
      ledgerEntry,
      newState,
    };
  }
}

// ============ BUNDLE DONATED VALUE ============

/**
 * Tổng giá trị (₫) đã góp vào trang sổ. Bản ghi thiếu `value` (save trước 16/10/2026):
 * ô tiền lấy `qty`, ô hàng ước theo giá nhập món rẻ nhất ô nhận.
 */
export function bundleDonatedValue(bundleDef: CivicBundleDef, state: CivicBundleState | undefined): number {
  return (state?.contributions ?? []).reduce((sum, c) => {
    if (c.value !== undefined) return sum + c.value;
    const slot = bundleDef.slots.find((s) => s.id === c.slotId);
    if (!slot) return sum;
    if (slot.kind === 'cash') return sum + c.qty;
    const unit = Math.min(...(slot.acceptedProductIds ?? []).map((pid) => PRODUCT_MAP[pid]?.purchasePrice ?? 0));
    return sum + c.qty * (Number.isFinite(unit) ? unit : 0);
  }, 0);
}

/** Tổng tiền một người đã góp vào các ô QUỸ trong một ngày (để tính trần góp tiền theo ngày). */
export function cashDonatedOnDay(bundleStates: Record<string, CivicBundleState | undefined> | undefined, playerId: string, day: number): number {
  let total = 0;
  for (const bundle of CIVIC_BUNDLES) {
    const cashSlots = new Set(bundle.slots.filter((s) => s.kind === 'cash').map((s) => s.id));
    for (const c of bundleStates?.[bundle.id]?.contributions ?? []) if (c.playerId === playerId && c.day === day && cashSlots.has(c.slotId)) total += c.qty;
  }
  return total;
}

/** Trần góp tiền mỗi thành viên mỗi ngày khi chủ hẻm offline = 30% tiền chung của hẻm (tính trên số dư đầu ngày). */
export const OFFLINE_DAILY_CASH_CAP_RATIO = 0.3;

/** Số tòa đã có của một loại (id dạng `${typeId}-${n}`); DUY NHẤT một cách đếm cho giá phiếu, giá trừ tiền và trần instance.
 * Khớp chính xác `n` là số nên `park-1` không bị tính cho loại `park-big` (id có tiền tố trùng). */
export function countBuildingsOfType(placements: ReadonlyArray<{ buildingId: string }> | undefined, typeId: string): number {
  const prefix = `${typeId}-`;
  return (placements ?? []).filter((p) => p.buildingId.startsWith(prefix) && /^\d+$/.test(p.buildingId.slice(prefix.length))).length;
}

/**
 * Giá xây thực tế cho `open_building` (chủ dự án chốt 16/10/2026): trang sổ của loại tòa đã xong và CHƯA có
 * tòa nào của loại đó → giá trị đã góp được tính vào giá xây, tòa đầu chỉ trả phần còn lại (tối thiểu 0).
 * Còn lại giữ `baseCost`. */
export function civicOpenCost(
  buildingTypeId: string,
  baseCost: number,
  bundleStates: Record<string, CivicBundleState | undefined> | undefined,
  existingCount: number
): number {
  if (existingCount > 0) return baseCost;
  const bundle = CIVIC_BUNDLES.find((b) => b.buildingTypeId === buildingTypeId);
  const state = bundle ? bundleStates?.[bundle.id] : undefined;
  if (!bundle || !isBundleCompleted(bundle, state)) return baseCost;
  return Math.max(0, baseCost - bundleDonatedValue(bundle, state));
}
