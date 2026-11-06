import type { Furniture } from '../core/gameTypes';
import { footprint, furnitureDef } from './furniture';

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

/** Cấp mở khu ăn tại chỗ (khớp unlock của bàn ăn/ghế — "Mini mart" đủ lớn mới có chỗ ngồi). */
export const DINE_UNLOCK = 30;
/** Tỉ lệ khách mua món nấu tươi muốn ngồi lại ăn (khi còn chỗ trống). */
export const DINE_CHANCE = 0.3;
/** Thời gian ngồi ăn (giây game) — cùng thước đo với các pause trong agent khách. */
export const EAT_SECONDS = 8;

/** Khách này có muốn ngồi lại ăn không? `roll` là lần quay đã rút (không rút khi điều kiện sớm sai). */
export function wantsDineIn(args: { level: number; hasCooked: boolean; roll: number }): boolean {
  return args.level >= DINE_UNLOCK && args.hasCooked && args.roll < DINE_CHANCE;
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
