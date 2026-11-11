import type { Furniture } from '../core/gameTypes';
import { footprint, furnitureDef } from './furniture';
import { hasFeature } from './features';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1490 — quy tắc "ghế kề bàn" cho khu ăn tại chỗ (THUẦN, không đụng store/three
// để test được như các helper tách ở GĐ1208/1213/1216).
//
// Quy ước: một ghế chỉ tính là chỗ ngồi của bàn khi tâm ghế nằm trong khung kề
// quanh bàn (mỗi phía rộng thêm ~nửa ghế + khe hở 0.05m) — bốn phía quanh bàn
// đều ghép được, đúng cách người chơi kê ghế quanh bàn; bàn đã đủ seatSlots thì
// không nhận thêm ghế.
// ─────────────────────────────────────────────────────────────────────────────

/** Khoảng hở cho phép khi kê ghế quanh bàn: nửa ghế (0.25) + khe 0.05m. */
export const SEAT_MARGIN = 0.3;
/** Nềp số thực: mép kề tính đúng dù cộng trừ số lẻ nhị phân (0.35+0.3 vs 0.65). */
const EPS = 1e-6;

/** Ghế này có kề bàn kia không (theo khung kề quanh footprint bàn đã xoay). */
export function chairAtTable(chair: Furniture, table: Furniture): boolean {
  const [tw, td] = footprint(table.type, table.rot);
  return Math.abs(chair.x - table.x) <= tw / 2 + SEAT_MARGIN + EPS
    && Math.abs(chair.z - table.z) <= td / 2 + SEAT_MARGIN + EPS;
}

/** Danh sách ghế đang kề một bàn (kể cả ghế đang có khách ngồi). */
export function linkedChairs(furniture: Furniture[], tableUid: number): Furniture[] {
  const table = furniture.find((f) => f.uid === tableUid && f.type === 'dining_table');
  if (!table) return [];
  return furniture.filter((f) => f.type === 'chair' && chairAtTable(f, table));
}

/** Số chỗ còn trống của một bàn: ghế kề chưa ai ngồi, chốt trên bởi seatSlots của FurnitureDef. */
export function tableFreeSeats(furniture: Furniture[], tableUid: number, occupiedChairs: ReadonlySet<number> = new Set()): number {
  const table = furniture.find((f) => f.uid === tableUid);
  if (!table || table.type !== 'dining_table') return 0;
  const max = furnitureDef(table.type).seatSlots ?? 0;
  if (max <= 0) return 0;
  const open = linkedChairs(furniture, tableUid).filter((c) => !c.broken && !occupiedChairs.has(c.uid)).length;
  return Math.min(max, open);
}

export interface SeatInfo {
  tableUid: number;
  chairUid: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1491 — khách "ăn tại chỗ" (đối chiếu khu dine-in): khách mua món nấu tươi
// có thể ngồi lại ăn thay vì ra về. Hằng số + quyết định tách THUẦN để test/soi sáng.
// ─────────────────────────────────────────────────────────────────────────────

/** Cấp mở khu ăn tại chỗ (SPEC-TOI-UU T3-L4: 30→33, tách khỏi Mini mart, cần bếp quen; khớp unlock bàn/ghế). */
export const DINE_UNLOCK = 33;
/** Tỉ lệ khách mua món nấu tươi muốn ngồi lại ăn (khi còn chỗ trống). */
export const DINE_CHANCE = 0.3;
/** Thời gian ngồi ăn (giây game) — cùng thước đo với các pause trong agent khách. */
export const EAT_SECONDS = 8;
/** GĐ1492 — chờ ghế tối đa bao nhiêu giây game thì bỏ về buồn. */
export const DINE_WAIT_SECONDS = 10;
/** GĐ1492 — tỉ lệ tip trên tổng tiền món nấu tươi (thưởng phục vụ có chỗ ngồi). */
export const TIP_RATE = 0.1;

/** Khách này có muốn ngồi lại ăn không? `roll` là lần quay đã rút (không rút khi điều kiện sớm sai). */
export function wantsDineIn(args: { level: number; hasCooked: boolean; roll: number }): boolean {
  return hasFeature(args, 'dineIn') && args.hasCooked && args.roll < DINE_CHANCE;
}

/**
 * GĐ1492 — tiền tip của một lượt ăn tại chỗ: 10% tổng tiền món nấu tươi khi được
 * phục vụ nhanh; bỏ về thì không tip.
 * GĐ1511 — tip 2 nấc theo kiên nhẫn: chờ ghế ≤ nửa ngưỡng (DINE_WAIT_SECONDS/2) vẫn đủ 10%;
 * chờ lâu hơn còn 60% (khách hơi phật ý nhưng vẫn ngồi). Truyền số giây đã chờ (0 = ngồi ngay).
 */
export const TIP_PATIENT_SECONDS = DINE_WAIT_SECONDS / 2;
export const TIP_LATE_FACTOR = 0.6;
export function dineTip(freshTotal: number, waitedSeconds: number): number {
  if (freshTotal <= 0) return 0;
  const f = waitedSeconds <= TIP_PATIENT_SECONDS ? 1 : TIP_LATE_FACTOR;
  return Math.round(freshTotal * TIP_RATE * f);
}

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1494 — nhà vệ sinh cho khu ăn tại chỗ: sau khi ăn ~20% khách có nhu cầu,
// 4 giây/lượt rồi trả phí. Hoàn vốn CHẬM (~500 lượt) — là tiện ích giữ satisfied,
// không phải máy kiếm lời. Hai giai đoạn: dưới mốc nghiêm ngặt thì thiếu bồn chỉ
// làm khách phật ý nhẹ; tới mốc (siêu thị lớn) thì khách nổi giận kéo sao xuống.
// ─────────────────────────────────────────────────────────────────────────────

export type ToiletId = 'toilet_squat' | 'toilet_porcelain' | 'toilet_smart';

export const TOILET_NEED_CHANCE = 0.2;
export const TOILET_USE_SECONDS = 4;
/** Từ cấp này (Siêu thị tạp hóa) thiếu bồn thì khách nổi giận — "rủi ro mở sau". */
export const TOILET_STRICT_UNLOCK = 45;

export const TOILET_TYPES: Record<ToiletId, { name: string; price: number; fee: number; icon: string }> = {
  toilet_squat: { name: 'Nhà vệ sinh ngồi xổm', price: 250_000, fee: 500, icon: '🚽' },
  toilet_porcelain: { name: 'Nhà vệ sinh bồn sứ', price: 1_200_000, fee: 2_000, icon: '🚽' },
  toilet_smart: { name: 'Nhà vệ sinh thông minh', price: 4_000_000, fee: 8_000, icon: '🛁' },
};

export const isToilet = (type: string): type is ToiletId => type in TOILET_TYPES;

export const toiletFee = (type: Furniture['type']): number => TOILET_TYPES[type as ToiletId]?.fee ?? 0;

/** Tìm một bồn đang trống (bỏ bồn bận và bồn hỏng). */
export function freeToilet(furniture: Furniture[], busyUids: ReadonlySet<number>): Furniture | null {
  for (const f of furniture) {
    if (!isToilet(f.type) || f.broken) continue;
    if (!busyUids.has(f.uid)) return f;
  }
  return null;
}

/**
 * Tìm một chỗ ngồi trống: ghế chưa bị khách chiếm, kề một bàn còn dư chỗ (chốt trên
 * bởi seatSlots). Ưu tiên bàn còn nhiều chỗ trống nhất (khách dồn về cùng bàn như
 * quán ăn thật, bàn vắng để trọn dịp khách đi đông). Trả null khi không còn chỗ nào.
 */
export function freeSeat(furniture: Furniture[], occupiedChairs: ReadonlySet<number>): SeatInfo | null {
  let best: { seat: SeatInfo; free: number } | null = null;
  for (const table of furniture) {
    if (table.type !== 'dining_table' || table.broken) continue;
    const open = linkedChairs(furniture, table.uid).filter((c) => !c.broken && !occupiedChairs.has(c.uid));
    const free = Math.min(furnitureDef(table.type).seatSlots ?? 0, open.length);
    if (!open.length || free <= 0) continue;
    if (!best || free > best.free) best = { seat: { tableUid: table.uid, chairUid: open[0].uid }, free };
  }
  return best ? best.seat : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1536 — thực đơn tối thiểu theo cấp quán (Midnight #9, mốc 3→12 món): số món nấu
// KHÁC NHAU đang bày kệ đạt mục tiêu cấp thì tip ×1,2; dưới một nửa mục tiêu tip ×0,8.
// Chỉ từ cấp 31 (golden ≤30 không đổi). Tip là thu phụ → bán lẻ vẫn chính.
// ─────────────────────────────────────────────────────────────────────────────
export const MENU_RULE_UNLOCK = 31;
export const menuTarget = (level: number) => Math.min(12, 3 + Math.max(0, Math.floor((level - 30) / 7)));
export function menuTipMul(level: number, distinctCooked: number): number {
  if (level < MENU_RULE_UNLOCK) return 1;
  const t = menuTarget(level);
  if (distinctCooked >= t) return 1.2;
  if (distinctCooked * 2 < t) return 0.8;
  return 1;
}
