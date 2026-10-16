/**
 * View-model thuần cho tab "Sổ góp xóm" (OpenSpec `civic-city-goals`, Giai đoạn 4).
 * UI không tự tính luật: trạng thái trang, tồn kho góp được, giá còn phải trả đều lấy từ đây
 * (dùng chung `civic-bundles.ts` nên khớp với lệnh `donate_to_bundle` thật).
 */
import { CIVIC_BUNDLES, PRODUCT_MAP, bundleBuildCost, expectedBundleGoodsValue, type CivicBundleDef } from '@game/data';
import type { InventoryItem } from '@game/shared';
import {
  BUNDLE_MIN_SHELF_DAYS,
  bundleDonatedValue,
  civicOpenCost,
  isBundleCompleted,
  itemLots,
  type CivicBundleState,
} from './civic-bundles';
import { CIVIC_REVEAL_GOALS, isBundleRevealed } from './civic-reveal-goals';

export type BundleCardStatus = 'hidden' | 'collecting' | 'complete' | 'built';

/** Mã lý do góp không được của một ô (UI map sang tiếng Việt). */
export type SlotBlockReason = 'slot_full' | 'no_stock' | 'expiring' | 'no_money' | 'bundle_done';

/**
 * Sau khi server từ chối lệnh góp (hai người góp cùng ô cùng lúc) và client đã tải lại sổ: suy ra mã lý do đúng
 * từ trạng thái mới — ô/trang đã đủ → `slot_full`/`bundle_done`; còn lại → `retry` (thử lại).
 */
export function reconcileDonateRejection(views: readonly BundleCardView[], bundleId: string, slotId: string): 'slot_full' | 'bundle_done' | 'retry' {
  const view = views.find((v) => v.id === bundleId);
  if (!view) return 'retry';
  if (view.status === 'complete' || view.status === 'built') return 'bundle_done';
  const slot = view.slots.find((s) => s.id === slotId);
  return slot && slot.short <= 0 ? 'slot_full' : 'retry';
}

export interface BundleSlotView {
  id: string;
  label: string;
  kind: 'goods' | 'cash';
  current: number;
  target: number;
  /** Phần thiếu. */
  short: number;
  done: boolean;
  accepted: { productId: string; name: string; unitCost: number; eligible: number; total: number }[];
  /** Hàng: tổng lô còn hạn ≥ BUNDLE_MIN_SHELF_DAYS các món nhận; tiền: số tiền hiện có. */
  available: number;
  canDonate: boolean;
  blockReason?: SlotBlockReason;
}

export interface BundleCardView {
  id: string;
  buildingTypeId: string;
  revealedByCityLevel: number;
  status: BundleCardStatus;
  /** Mục tiêu xóm phố hiện sổ này (cho thẻ "chưa hiện"). */
  revealGoalId?: string;
  slots: BundleSlotView[];
  slotsDone: number;
  slotsTotal: number;
  /** Có hàng trong kho góp được vào ít nhất một ô hàng còn thiếu (chấm đỏ). */
  hasDonatable: boolean;
  buildCost: number;
  donatedValue: number;
  /** Giá còn phải trả khi xây tòa tiếp theo (đúng hàm `civicOpenCost` lúc trừ tiền). */
  remainingCost: number;
  expectedGoodsValue: number;
  completedDay?: number;
  /** Người góp nhiều nhất (theo giá trị) + % tổng giá trị. */
  topDonor?: { playerId: string; percent: number };
  /** Mọi người góp (giảm dần theo giá trị) — cho popup hoàn thành. */
  donors: { playerId: string; percent: number }[];
}

/**
 * Tên hiển thị của người góp. Không bao giờ lộ uid/email: id lạ (đã rời hẻm) → "Thành viên cũ".
 * `members`: accountId → tên hiển thị của thành viên hiện tại; `selfId`: tài khoản đang xem ("Bạn").
 */
export function donorDisplayName(playerId: string, members?: Readonly<Record<string, string | undefined>>, selfId?: string | null): string {
  if (playerId === 'local' || (selfId && playerId === selfId)) return 'Bạn';
  if (members && Object.prototype.hasOwnProperty.call(members, playerId)) {
    const name = members[playerId]?.trim();
    return name && !name.includes('@') ? name : 'Bạn cùng hẻm';
  }
  return 'Thành viên cũ';
}

export interface BundleViewInput {
  bundleStates: Record<string, CivicBundleState | undefined>;
  cityLevel: number;
  revealedBundleIds: readonly string[];
  inventory: readonly InventoryItem[];
  playerMoney: number;
  day: number;
  /** typeId → số tòa đã đặt. */
  existingBuildings: Readonly<Record<string, number>>;
}

function donorStats(def: CivicBundleDef, state: CivicBundleState | undefined): BundleCardView['donors'] {
  const contributions = state?.contributions ?? [];
  if (contributions.length === 0) return [];
  const totals = new Map<string, number>();
  for (const c of contributions) {
    const slot = def.slots.find((s) => s.id === c.slotId);
    let value = c.value;
    if (value === undefined) {
      value = c.qty;
      if (slot?.kind === 'goods') {
        const unit = Math.min(...(slot.acceptedProductIds ?? []).map((pid) => PRODUCT_MAP[pid]?.purchasePrice ?? 0));
        value = c.qty * (Number.isFinite(unit) ? unit : 0);
      }
    }
    totals.set(c.playerId, (totals.get(c.playerId) ?? 0) + value);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  if (sum <= 0) return [];
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([playerId, v]) => ({ playerId, percent: Math.round((v / sum) * 100) }));
}

export function buildCivicBundleViews(input: BundleViewInput): BundleCardView[] {
  const { bundleStates, cityLevel, revealedBundleIds, inventory, playerMoney, day, existingBuildings } = input;
  return CIVIC_BUNDLES.map((def) => {
    const state = bundleStates[def.id];
    const revealed = isBundleRevealed(def.id, cityLevel, revealedBundleIds);
    const complete = isBundleCompleted(def, state);
    const built = (existingBuildings[def.buildingTypeId] ?? 0) > 0;
    const status: BundleCardStatus = !revealed ? 'hidden' : built && complete ? 'built' : complete ? 'complete' : 'collecting';
    const slots: BundleSlotView[] = def.slots.map((slot) => {
      const current = state?.slots[slot.id] ?? 0;
      const target = slot.kind === 'cash' ? (slot.amount ?? 0) : (slot.quantity ?? 0);
      const short = Math.max(0, target - current);
      const accepted = (slot.acceptedProductIds ?? []).map((productId) => {
        const item = inventory.find((i) => i.productId === productId);
        const lots = item ? itemLots(item, day) : [];
        const eligible = lots.filter((l) => l.expiresOnDay - day >= BUNDLE_MIN_SHELF_DAYS).reduce((s, l) => s + l.quantity, 0);
        const total = lots.reduce((s, l) => s + l.quantity, 0);
        return { productId, name: PRODUCT_MAP[productId]?.name ?? productId, unitCost: PRODUCT_MAP[productId]?.purchasePrice ?? 0, eligible, total };
      });
      const available = slot.kind === 'cash' ? playerMoney : accepted.reduce((s, a) => s + a.eligible, 0);
      let blockReason: SlotBlockReason | undefined;
      if (complete) blockReason = 'bundle_done';
      else if (short <= 0) blockReason = 'slot_full';
      else if (slot.kind === 'cash') blockReason = playerMoney <= 0 ? 'no_money' : undefined;
      else if (available <= 0) blockReason = accepted.some((a) => a.total > 0) ? 'expiring' : 'no_stock';
      return { id: slot.id, label: slot.label, kind: slot.kind, current, target, short, done: short <= 0, accepted, available, canDonate: blockReason === undefined, blockReason };
    });
    const buildCost = bundleBuildCost(def);
    const donors = donorStats(def, state);
    return {
      id: def.id,
      buildingTypeId: def.buildingTypeId,
      revealedByCityLevel: def.revealedByCityLevel,
      status,
      revealGoalId: CIVIC_REVEAL_GOALS.find((g) => g.revealBundleId === def.id)?.id,
      slots,
      slotsDone: slots.filter((s) => s.done).length,
      slotsTotal: slots.length,
      hasDonatable: status === 'collecting' && slots.some((s) => s.kind === 'goods' && s.canDonate),
      buildCost,
      donatedValue: bundleDonatedValue(def, state),
      remainingCost: civicOpenCost(def.buildingTypeId, buildCost, bundleStates, existingBuildings[def.buildingTypeId] ?? 0),
      expectedGoodsValue: expectedBundleGoodsValue(def),
      completedDay: state?.completedDay,
      donors,
      topDonor: donors[0],
    };
  });
}

/** Giá vốn FIFO dự kiến khi góp `quantity` món `productId` (xem trước bảng góp; không đổi kho). */
export function previewDonationCost(inventory: readonly InventoryItem[], productId: string, quantity: number, day: number): number {
  const item = inventory.find((i) => i.productId === productId);
  if (!item) return 0;
  const unitFallback = PRODUCT_MAP[productId]?.purchasePrice ?? 0;
  const lots = itemLots(item, day)
    .filter((l) => l.expiresOnDay - day >= BUNDLE_MIN_SHELF_DAYS)
    .sort((a, b) => a.expiresOnDay - b.expiresOnDay);
  let left = quantity;
  let cost = 0;
  for (const lot of lots) {
    const take = Math.min(left, lot.quantity);
    cost += take * (lot.unitCost ?? unitFallback);
    left -= take;
    if (left <= 0) break;
  }
  return cost;
}

/** Món mà ít nhất một ô hàng đang hiện còn thiếu cần (huy hiệu "Xóm cần" ở kho/nhập hàng). */
export function bundleNeededProductIds(views: readonly BundleCardView[]): Set<string> {
  const ids = new Set<string>();
  for (const v of views) {
    if (v.status !== 'collecting') continue;
    for (const slot of v.slots) {
      if (slot.kind !== 'goods' || slot.done) continue;
      for (const a of slot.accepted) ids.add(a.productId);
    }
  }
  return ids;
}
