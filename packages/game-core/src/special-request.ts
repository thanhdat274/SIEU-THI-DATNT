/**
 * Yêu cầu đặc biệt của khách VIP — phần lõi thuần (tính năng đề xuất #2, PHẦN THUẦN / PROVISIONAL).
 *
 * Đây là lớp LOGIC THUẦN cầm trạng thái vòng đời của các "yêu cầu đặc biệt": sinh mới (deterministic theo
 * seed/ngày/phút), chạy hết hạn theo đồng hồ game, hoàn thành idempotent khi đủ hàng, và tính thưởng/phạt.
 * Dữ liệu template lấy từ catalog `@game/data/world/special-requests` (cùng cấu trúc `party-orders`).
 *
 * KHÔNG nối vào luồng khách có sẵn (`customers.ts`/`simulation.ts`), KHÔNG ghi save/UI, KHÔNG trừ kho thật
 * (giao `customers`/`stock` xử lý FEFO — như `party-orders`). Trạng thái là object thuần được truyền vào/ra
 * để sau này persist lên save hoặc render trên UI — phần nối đó ghi rõ CHỜ MÁY THẬT (xem `tổng hợp.md`).
 */
import {
  MAX_CONCURRENT_SPECIAL_REQUESTS,
  MAX_SPECIAL_REQUESTS_PER_DAY,
  SPECIAL_REQUEST_MAP,
  SPECIAL_REQUEST_UNLOCK_LEVEL,
  type SpecialRequestDef,
} from '@game/data';

/** Phút trong một ngày game (0..1439). */
export const MINUTES_PER_DAY = 1440;

/** Xác suất cơ bản mỗi lần gọi sinh một yêu cầu (provisional, cần playtest). */
export const SPECIAL_REQUEST_BASE_CHANCE = 0.35;

export type SpecialRequestStatus = 'active' | 'completed' | 'expired';

/** Một yêu cầu đang tồn tại trên sàn (có instance riêng để chống trùng trong co-op). */
export interface ActiveSpecialRequest {
  /** id duy nhất cho lần này (vd `${openDay}-${defId}-${n}`). */
  instanceId: string;
  /** id của template trong `SPECIAL_REQUEST_MAP`. */
  defId: string;
  status: SpecialRequestStatus;
  openDay: number;
  /** phút tuyệt đối khi mở = day*1440 + minute. */
  openMinute: number;
  /** hạn tuyệt đối = openMinute + timeWindowMinutes. */
  expiresMinute: number;
  completedDay?: number;
  completedMinute?: number;
}

/** Trạng thái toàn cục của hệ yêu cầu đặc biệt (object thuần). */
export interface SpecialRequestState {
  active: ActiveSpecialRequest[];
  /** instance đã hoàn thành (để idempotent / chống lặp lại phạt). */
  completedInstanceIds: string[];
  /** số lần VIP bực bội (bị bỏ qua/hết hạn) — cộng dồn, để sau này phạt uy tín qua streak. */
  vexedCount: number;
  /** ngày đã roll sinh (reset `openedToday` khi đổi ngày). */
  lastRolledDay?: number;
  /** số yêu cầu đã mở trong ngày hôm nay (trần `MAX_SPECIAL_REQUESTS_PER_DAY`). */
  openedToday: number;
}

/** Tham số sinh yêu cầu. */
export interface SpawnRequestContext {
  day: number;
  minute: number; // 0..1439
  worldSeed: number | string;
  playerLevel: number;
}

/** Kết quả sinh. */
export interface SpawnRequestResult {
  state: SpecialRequestState;
  opened: ActiveSpecialRequest | null;
}

/** Phần thưởng/phạt khi hoàn thành hoặc bỏ qua. */
export interface SpecialRequestReward {
  money: number;
  reputation: number;
  penaltyReputation: number;
  tier: SpecialRequestDef['tier'];
  defId: string;
}

/** Chuyển hằng số seed thành số 32-bit (giống `regulars.ts`). */
function seedToNumber(seed: number | string): number {
  if (typeof seed === 'number') return seed & 0x7fffffff;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  return h;
}

/** Hash xác định 0..1 kết hợp seed+day+minute+stream. */
function seededRoll(worldSeed: number | string, day: number, minute: number, stream: number): number {
  let h = (seedToNumber(worldSeed) * 31 + day * 101 + minute * 17 + stream * 59) & 0x7fffffff;
  h = Math.imul(h, 2654435761) >>> 0;
  return (h % 10000) / 10000;
}

export function absMinute(day: number, minute: number): number {
  return day * MINUTES_PER_DAY + minute;
}

export function createSpecialRequestState(): SpecialRequestState {
  return { active: [], completedInstanceIds: [], vexedCount: 0, openedToday: 0 };
}

function nextInstanceSeq(state: SpecialRequestState, day: number, defId: string): string {
  const base = state.active.length + state.completedInstanceIds.length + state.vexedCount;
  return `${day}-${defId}-${base}`;
}

/**
 * Sinh (optional) một yêu cầu mới. Deterministic theo seed/ngày/phút; tôn trọng:
 *  - mở khóa cấp (`SPECIAL_REQUEST_UNLOCK_LEVEL`),
 *  - trần số yêu cầu đồng thời (`MAX_CONCURRENT_SPECIAL_REQUESTS`),
 *  - trần mỗi ngày (`MAX_SPECIAL_REQUESTS_PER_DAY`),
 *  - template theo `minPlayerLevel` của người chơi.
 * Khi đổi ngày thì reset `openedToday`.
 */
export function maybeOpenSpecialRequest(
  state: SpecialRequestState,
  ctx: SpawnRequestContext
): SpawnRequestResult {
  const { day, minute, worldSeed, playerLevel } = ctx;
  let openedToday = state.lastRolledDay === day ? state.openedToday : 0;

  // Chọn template hợp lệ theo cấp, chưa từng đồng thời mở.
  const activeDefIds = new Set(state.active.map((a) => a.defId));
  const defs = Object.values(SPECIAL_REQUEST_MAP).filter(
    (d) => d.minPlayerLevel <= playerLevel && !activeDefIds.has(d.id)
  );

  if (
    playerLevel >= SPECIAL_REQUEST_UNLOCK_LEVEL &&
    defs.length > 0 &&
    openedToday < MAX_SPECIAL_REQUESTS_PER_DAY &&
    state.active.length < MAX_CONCURRENT_SPECIAL_REQUESTS
  ) {
    // Roll có xác suất; stream = day để ổn định trong ngày nhưng đổi theo phút gọi.
    const roll = seededRoll(worldSeed, day, minute, 1);
    if (roll < SPECIAL_REQUEST_BASE_CHANCE) {
      // Chọn template theo hash (ổn định trong ngày với cùng stream 2).
      const pick = seededRoll(worldSeed, day, 0, 2);
      const idx = Math.floor(pick * defs.length) % defs.length;
      const def = defs[idx];
      const openMinute = absMinute(day, minute);
      const request: ActiveSpecialRequest = {
        instanceId: nextInstanceSeq(state, day, def.id),
        defId: def.id,
        status: 'active',
        openDay: day,
        openMinute,
        expiresMinute: openMinute + def.timeWindowMinutes * 1, // phút game
      };
      return {
        state: { ...state, active: [...state.active, request], lastRolledDay: day, openedToday: openedToday + 1 },
        opened: request,
      };
    }
  }

  return { state: { ...state, lastRolledDay: day, openedToday }, opened: null };
}

/**
 * Tiến đồng hồ game đến (day, minute): mọi yêu cầu `active` quá hạn (expiresMinute < nowAbs) chuyển sang
 * `expired`; nếu tier của template chứa 'vip' thì tăng `vexedCount` (bỏ qua/muộn → phạt uy tín về sau).
 * Thuần — chỉ cập nhật trạng thái, không tác động tài nguyên.
 */
export function advanceSpecialRequests(
  state: SpecialRequestState,
  now: { day: number; minute: number }
): SpecialRequestState {
  const nowAbs = absMinute(now.day, now.minute);
  let changed = false;
  let vexed = 0;
  const nextActive = state.active.map((a) => {
    if (a.status !== 'active' || a.expiresMinute >= nowAbs) return a;
    changed = true;
    const def = SPECIAL_REQUEST_MAP[a.defId];
    if (def && def.tier.includes('vip')) vexed += 1;
    return { ...a, status: 'expired' as const };
  });
  if (!changed) return state;
  return { ...state, active: nextActive, vexedCount: state.vexedCount + vexed };
}

/** Yêu cầu còn ở trạng thái hoàn thành được (active & còn hạn) không? */
export function isFulfillable(state: SpecialRequestState, instanceId: string): boolean {
  const r = state.active.find((a) => a.instanceId === instanceId);
  return !!r && r.status === 'active';
}

/** Kiểm tra đủ món (caller đưa khả năng cung ứng) cho yêu cầu còn hạn. */
export function canFulfillSpecialRequest(
  state: SpecialRequestState,
  instanceId: string,
  hasItem: (productId: string, quantity: number) => boolean
): { ok: boolean; reason?: string; missing?: string[] } {
  const r = state.active.find((a) => a.instanceId === instanceId);
  if (!r) return { ok: false, reason: 'Không thấy yêu cầu' };
  if (r.status !== 'active') return { ok: false, reason: `Yêu cầu đã ${r.status}` };
  const def = SPECIAL_REQUEST_MAP[r.defId];
  if (!def) return { ok: false, reason: 'Template không tồn tại' };
  const missing: string[] = [];
  for (const item of def.requiredItems) {
    if (!hasItem(item.productId, item.quantity)) missing.push(item.productId);
  }
  return missing.length === 0 ? { ok: true } : { ok: false, reason: 'Thiếu hàng', missing };
}

/**
 * Hoàn thành một yêu cầu (idempotent). Trả state mới + reward nếu thành công.
 * KHÔNG trừ kho thật — caller đã cung cấp checklist qua `canFulfillSpecialRequest` và tự trừ theo FEFO
 * (tương tự `party-orders`). Mọi yêu cầu đã `completed` hoặc quá hạn không thể hoàn thành lại.
 */
export function fulfillSpecialRequest(
  state: SpecialRequestState,
  instanceId: string,
  now: { day: number; minute: number }
): { state: SpecialRequestState; success: boolean; reason?: string; reward?: SpecialRequestReward } {
  const r = state.active.find((a) => a.instanceId === instanceId);
  if (!r) return { state, success: false, reason: 'Không thấy yêu cầu' };
  if (r.status === 'completed') return { state, success: false, reason: 'Đã hoàn thành trước đó' };
  if (r.status !== 'active') return { state, success: false, reason: `Yêu cầu đã ${r.status}` };
  if (absMinute(now.day, now.minute) > r.expiresMinute) {
    return { state, success: false, reason: 'Quá hạn' };
  }
  const def = SPECIAL_REQUEST_MAP[r.defId];
  if (!def) return { state, success: false, reason: 'Template không tồn tại' };
  const done: ActiveSpecialRequest = {
    ...r,
    status: 'completed',
    completedDay: now.day,
    completedMinute: absMinute(now.day, now.minute),
  };
  const nextActive = state.active.map((a) => (a.instanceId === instanceId ? done : a));
  const nextState: SpecialRequestState = {
    ...state,
    active: nextActive,
    completedInstanceIds: [...state.completedInstanceIds, instanceId],
  };
  return {
    state: nextState,
    success: true,
    reward: {
      money: def.rewardMoney,
      reputation: def.rewardReputation,
      penaltyReputation: def.penaltyReputation,
      tier: def.tier,
      defId: def.id,
    },
  };
}
