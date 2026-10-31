/**
 * Tiệm xôi (GĐ410): cơ sở thứ ba, mở ở cấp 40 — xưởng nấu xôi SỐ LƯỢNG LỚN cung ứng cho tạp hóa.
 * Người dùng chọn hướng (b): Quây xôi trong tiệm vẫn giữ nguyên (tạp hóa lớn dần thành siêu thị),
 * tiệm xôi chỉ nấu thêm, rẻ hơn, rồi đổ vào kho chung mỗi đêm.
 * Chạy THEO NGÀY như quán nước: `endDay` gọi đúng một lần `tiemXoiDay`, không Math.random → solo và
 * co-op ra cùng kết quả. File này chỉ có dữ liệu và hàm thuần; hành động nằm ở `core/slices/tiemXoi.ts`.
 */
import { productById, unlockedProducts } from './products';

/** Cấp tối thiểu được mở tiệm xôi (sau Quây xôi cấp 36). */
export const TIEM_XOI_UNLOCK = 40;
/** Giá mua mặt bằng tiệm xôi (mua đứt, một lần). */
export const TIEM_XOI_PRICE = 30_000_000;
/** Phí tuyển một thợ nấu (không hoàn lại khi cho nghỉ). */
export const TIEM_XOI_HIRE_FEE = 300_000;
/** Lương mỗi thợ mỗi ngày (trả kể cả ngày kho đã đầy không phải nấu). */
export const TIEM_XOI_WAGE = 180_000;
/** Số thợ tối đa. */
export const TIEM_XOI_MAX_STAFF = 3;
/** Mỗi thợ nấu được bấy nhiêu phần một ngày (chủ tiệm tự nấu được thêm một phần như thế). */
export const TIEM_XOI_PER_COOK = 60;
/** Nấu số lượng lớn: giá vốn mỗi phần chỉ bằng tỉ lệ này so với giá nhập lẻ. */
export const TIEM_XOI_COST_MUL = 0.6;
/** Chỉ nấu bù đến mức tồn này mỗi món, tránh xôi dồn kho rồi hỏng. */
export const TIEM_XOI_TARGET = 80;

export interface TiemXoiState { open: boolean; staff: number }
export const newTiemXoi = (): TiemXoiState => ({ open: false, staff: 0 });

/** Món xôi lẻ (không gồm combo) đã mở ở `level`, giữ thứ tự bảng mẫu hàng. */
export const tiemXoiIds = (level: number): string[] =>
  unlockedProducts(level).filter((p) => p.id.startsWith('xoi_')).map((p) => p.id);

/** Số phần nấu được một ngày theo số thợ. */
export const tiemXoiCapacity = (staff: number): number => TIEM_XOI_PER_COOK * (1 + staff);

export interface TiemXoiDay { made: Record<string, number>; total: number; cost: number; wages: number; full: boolean }

/**
 * Một ngày của tiệm xôi — hoàn toàn xác định:
 *  - Mỗi món xôi đã mở cần nấu bù `TIEM_XOI_TARGET − tồn kho`.
 *  - Lần lượt nấu cho món THIẾU NHIỀU NHẤT trước (hoà thì theo thứ tự bảng mẫu hàng), mỗi lượt một
 *    phần, đến khi hết sức nấu (`tiemXoiCapacity`) hoặc mọi món đã đủ — chia đều thay vì dồn một món.
 *  - Giá vốn = phần nấu × giá nhập × TIEM_XOI_COST_MUL (làm tròn); lương luôn trả đủ.
 *  - `full` = kho đã đủ mọi món nên thợ còn rảnh sức.
 * Gọi `put(id, qty)` để cất vào kho. Trả null khi tiệm chưa mở.
 */
export function tiemXoiDay(
  t: TiemXoiState, level: number, storage: Record<string, number>, put: (id: string, qty: number) => void,
): TiemXoiDay | null {
  if (!t.open) return null;
  const ids = tiemXoiIds(level);
  const need: Record<string, number> = {};
  for (const id of ids) need[id] = Math.max(0, TIEM_XOI_TARGET - (storage[id] ?? 0));
  const made: Record<string, number> = {};
  let left = tiemXoiCapacity(t.staff);
  while (left > 0) {
    let pick: string | null = null;
    for (const id of ids) if (need[id] > 0 && (pick === null || need[id] > need[pick])) pick = id;
    if (pick === null) break;
    need[pick]--;
    made[pick] = (made[pick] ?? 0) + 1;
    left--;
  }
  let total = 0;
  let cost = 0;
  for (const [id, qty] of Object.entries(made)) {
    put(id, qty);
    total += qty;
    cost += qty * productById(id).buy * TIEM_XOI_COST_MUL;
  }
  return { made, total, cost: Math.round(cost), wages: t.staff * TIEM_XOI_WAGE, full: left > 0 };
}

/** Phần tiết kiệm so với nhập lẻ cùng số xôi đó (để báo người chơi tiệm xôi đáng đồng nào). */
export const tiemXoiSaved = (made: Record<string, number>): number =>
  Math.round(Object.entries(made).reduce((n, [id, q]) => n + q * productById(id).buy * (1 - TIEM_XOI_COST_MUL), 0));

/**
 * Dòng Sổ đầu ngày cho tiệm xôi (GĐ421): hôm qua nấu bao nhiêu, tiết kiệm so với nhập lẻ trừ lương
 * còn lời hay lỗ, và gợi ý khi thợ dư sức (kho đã đủ) — cho nghỉ bớt đỡ lương.
 */
export function tiemXoiMorning(
  t: TiemXoiState, last: { total: number; saved: number; wages: number } | null | undefined,
): { net: number | null; idle: boolean } {
  if (!last) return { net: null, idle: false };
  const net = last.saved - last.wages;
  const idle = t.staff > 0 && last.total <= tiemXoiCapacity(t.staff - 1);
  return { net, idle };
}
