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

export interface TiemXoiState { open: boolean; staff: number; /** GĐ439: ngày chủ tự đồ một mẻ ở sạp. */ handDay?: number; /** GĐ461: đã mở rộng bếp (kho mục tiêu + sức nấu lớn hơn). */ big?: boolean }
export const newTiemXoi = (): TiemXoiState => ({ open: false, staff: 0 });

/** Món xôi lẻ (không gồm combo) đã mở ở `level`, giữ thứ tự bảng mẫu hàng. */
export const tiemXoiIds = (level: number): string[] =>
  unlockedProducts(level).filter((p) => p.id.startsWith('xoi_')).map((p) => p.id);

/** Số phần nấu được một ngày theo số thợ. */
export const tiemXoiCapacity = (staff: number, big = false): number => Math.round(TIEM_XOI_PER_COOK * (1 + staff) * (big ? 1.5 : 1));
/** GĐ461 — mở rộng bếp xôi: cấp 42, 20tr; giữ 120 phần mỗi món, sức nấu ×1.5. */
export const TIEM_XOI_BIG_LEVEL = 42;
export const TIEM_XOI_BIG_COST = 20_000_000;
export const tiemXoiTarget = (t: Pick<TiemXoiState, 'big'>) => (t.big ? 120 : TIEM_XOI_TARGET);

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
  for (const id of ids) need[id] = Math.max(0, tiemXoiTarget(t) - (storage[id] ?? 0));
  const made: Record<string, number> = {};
  let left = tiemXoiCapacity(t.staff, !!t.big);
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

/** Trạng thái hình ảnh tiệm xôi 3D (GĐ430). */
export const tiemXoiStandState = (level: number, open: boolean): 'hidden' | 'lot' | 'open' =>
  open ? 'open' : level >= TIEM_XOI_UNLOCK ? 'lot' : 'hidden';

/** GĐ439 — chủ tự đồ một mẻ ở sạp mỗi ngày: 20 phần món đang thiếu nhiều nhất, vào kho ngay, giá vốn như tiệm. */
export const TIEM_XOI_HAND = 20;
/** GĐ444: mỗi thợ phụ thêm 5 phần cho mẻ chủ tự đồ. */
export const tiemXoiHandQty = (staff: number) => TIEM_XOI_HAND + 5 * Math.max(0, staff);
export const tiemXoiHandPick = (level: number, storage: Record<string, number>): string | null => {
  let pick: string | null = null;
  for (const id of tiemXoiIds(level)) if (pick === null || (storage[id] ?? 0) < (storage[pick] ?? 0)) pick = id;
  return pick;
};

/** GĐ484: tiệm xôi có nhà nên có khách ngồi ăn tại chỗ — 10 suất + 5/thợ (bếp lớn ×1.5) mỗi ngày. */
export const tiemXoiDineCap = (staff: number, big = false) => Math.round((10 + 5 * staff) * (big ? 1.5 : 1));

/**
 * Kế hoạch khách ăn tại chỗ: lấy xôi từ kho (món còn nhiều nhất trước, hoà theo thứ tự mẫu hàng),
 * bán đúng giá lẻ. Thuần xác định; trả phần cần rút kho + doanh thu.
 */
export function tiemXoiDinePlan(t: TiemXoiState, level: number, storage: Record<string, number>): { take: Record<string, number>; portions: number; revenue: number } {
  const left: Record<string, number> = {};
  const ids = tiemXoiIds(level);
  for (const id of ids) left[id] = storage[id] ?? 0;
  const take: Record<string, number> = {};
  let n = t.open ? tiemXoiDineCap(t.staff, !!t.big) : 0;
  let portions = 0, revenue = 0;
  while (n > 0) {
    let pick: string | null = null;
    for (const id of ids) if (left[id] > 0 && (pick === null || left[id] > left[pick])) pick = id;
    if (pick === null) break;
    left[pick]--;
    take[pick] = (take[pick] ?? 0) + 1;
    portions++;
    revenue += productById(pick).sell;
    n--;
  }
  return { take, portions, revenue };
}
