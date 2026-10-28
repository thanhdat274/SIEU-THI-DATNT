/**
 * Quán nước đầu ngõ (GĐ7): địa điểm kinh doanh thứ hai, mở ở cấp 29, chuyên bán ĐỒ UỐNG rút nguyên liệu
 * từ kho chung (ăn vào chuỗi giá trị trại → kho → quán). Khác với chi nhánh tiện lợi (mô phỏng ngầm theo
 * bước 10 phút), quán nước chạy THEO NGÀY: mỗi lần sang ngày mới, `endDay` gọi đúng một lần `quanNuocDay`
 * — thiết kế tường minh, không dùng Math.random nên kết quả luôn xác định, dễ test.
 * File này chỉ có dữ liệu và hàm thuần; hành động mua/tuyển nằm ở `core/slices/quanNuoc.ts`.
 */
import { productById, unlockedProducts } from './products';

/** Cấp tối thiểu được mở quán nước. */
export const QUAN_NUOC_UNLOCK = 29;
/** Giá mua mặt bằng quán nước (mua đứt, một lần). */
export const QUAN_NUOC_PRICE = 25_000_000;
/** Phí tuyển một nhân viên quán nước (không hoàn lại khi cho nghỉ). */
export const QUAN_NUOC_HIRE_FEE = 300_000;
/** Lương mỗi nhân viên mỗi ngày (trả trong endDay, kể cả ngày kho cạn không bán được ly nào). */
export const QUAN_NUOC_WAGE = 150_000;
/** Số nhân viên tối đa. */
export const QUAN_NUOC_MAX_STAFF = 3;

/** Mức giá quán: rẻ hút nhiều khách nhưng lãi mỏng, đắt ngược lại. */
export type QuanNuocPrice = 're' | 'vua' | 'cao';
export const QUAN_PRICE_OPTIONS: Record<QuanNuocPrice, { mul: number; traffic: number; label: string }> = {
  re: { mul: 0.85, traffic: 1.2, label: 'Bình dân' },
  vua: { mul: 1.0, traffic: 1.0, label: 'Vừa phải' },
  cao: { mul: 1.3, traffic: 0.75, label: 'Đắt hơn' },
};

export interface QuanNuocState { open: boolean; staff: number; price: QuanNuocPrice }
export const newQuanNuoc = (): QuanNuocState => ({ open: false, staff: 0, price: 'vua' });

/** Trạng thái hình ảnh của quán nước trong thế giới 3D đầu hẻm. */
export type QuanNuocStandState = 'hidden' | 'lot' | 'open';
export function quanNuocStandState(level: number, open: boolean): QuanNuocStandState {
  if (open) return 'open';
  if (level >= QUAN_NUOC_UNLOCK) return 'lot';
  return 'hidden';
}

/** Kết quả một ngày bán của quán nước (ghi lại phần phục vụ được để báo tin sáng mai). */
export interface QuanNuocDay { revenue: number; customers: number; served: number; wanted: number; wages: number; short: boolean }

/** Món đồ uống (category 'drink' trong data/products.ts) đã mở ở `level`, giữ thứ tự bảng mẫu hàng. */
export const quanNuocDrinkIds = (level: number): string[] =>
  unlockedProducts(level).filter((p) => p.category === 'drink').map((p) => p.id);

/**
 * Mô phỏng một ngày bán của quán nước — hoàn toàn xác định (không Math.random):
 *  - Khách/ngày = round(45 × traffic × (1 + 0.15 × staff)); mỗi khách mua trung bình 1.5 ly
 *    → wanted = ceil(khách × 1.5).
 *  - Số ly phục vụ được bị chặn bởi tổng đơn vị ĐỒ UỐNG trong kho: served = min(wanted, tổng có).
 *  - Rút kho qua `take(id, qty)` theo thứ tự món CÓ NHIỀU NHẤT TRƯỚC (hoà nhau thì món đứng trước
 *    trong bảng mẫu hàng được rút trước — sort ổn định): ưu tiên tiêu thụ món đang tồn nhiều.
 *  - Doanh thu = served × giá bán TB (trung bình `sell` các món drink đã mở, lấy MỘT lần) × mul.
 *  - Lương luôn trả đủ: wages = staff × QUAN_NUOC_WAGE; short = còn khách muốn mua mà kho hết.
 * Trả về null khi quán chưa mở.
 */
export function quanNuocDay(
  q: QuanNuocState, level: number, storage: Record<string, number>, take: (id: string, qty: number) => void,
): QuanNuocDay | null {
  if (!q.open) return null;
  const drinks = quanNuocDrinkIds(level);
  const opt = QUAN_PRICE_OPTIONS[q.price];
  // Giá bán trung bình của thực đơn đã mở: tính một lần rồi nhân hệ số mức giá
  const avgPrice = drinks.length ? drinks.reduce((n, id) => n + productById(id).sell, 0) / drinks.length : 0;
  const customers = Math.round(45 * opt.traffic * (1 + 0.15 * q.staff));
  const wanted = Math.ceil(customers * 1.5);
  // Tổng ly phục vụ được bị chặn bởi tồn kho đồ uống
  const have = drinks.reduce((n, id) => n + (storage[id] ?? 0), 0);
  const served = Math.min(wanted, have);
  // Rút kho: món tồn nhiều nhất trước, đủ số ly phục vụ thì dừng
  let left = served;
  for (const id of [...drinks].sort((a, b) => (storage[b] ?? 0) - (storage[a] ?? 0))) {
    if (left <= 0) break;
    const n = Math.min(left, storage[id] ?? 0);
    if (n > 0) { take(id, n); left -= n; }
  }
  return {
    revenue: Math.round(served * avgPrice * opt.mul),
    customers, served, wanted,
    wages: q.staff * QUAN_NUOC_WAGE,
    short: served < wanted,
  };
}

/* —————————————————————————————————————————————————————————————————————
 * GĐ127: Sổ kinh doanh quán nước — mồi quyết định (thuê/sa thải, nhập kho, cân
 * kho với kệ tiệm chính). THUẦN ĐỌC state/hằng số có sẵn (quanNuocLast, storage,
 * quanNuocDrinkIds, QUAN_PRICE_OPTIONS, QUAN_NUOC_WAGE) — KHÔNG đổi SAVE_VERSION,
 * không persist, không đổi công thức kinh tế. Giá trị hiển thị tự tính LẠI từ cùng
 * công thức `quanNuocDay` nên không bao giờ lệch số liệu.
 * ————————————————————————————————————————————————————————————————————— */

/** Giá bán trung bình của thực đơn đồ uống đã mở (cùng công thức quanNuocDay). */
export const quanNuocAvgSell = (level: number): number => {
  const drinks = quanNuocDrinkIds(level);
  return drinks.length ? drinks.reduce((n, id) => n + productById(id).sell, 0) / drinks.length : 0;
};

export interface QuanNuocProjection { customers: number; wanted: number; served: number; revenue: number; wages: number; profit: number }

/**
 * Dự phóng một đêm bán của quán nước theo số nhân viên `q.staff`, chặn bởi tổng
 * đơn vị đồ uống hiện có `drinkUnits` (cap như `quanNuocDay`). THUẦN — không gọi
 * `take`, không đổi state. Dùng để hỏi "thuê thêm 1 người có đáng lương 150k không".
 */
export function quanNuocProjection(q: QuanNuocState, level: number, drinkUnits: number): QuanNuocProjection {
  const opt = QUAN_PRICE_OPTIONS[q.price];
  const avgPrice = quanNuocAvgSell(level);
  const customers = Math.round(45 * opt.traffic * (1 + 0.15 * q.staff));
  const wanted = Math.ceil(customers * 1.5);
  const served = Math.min(wanted, Math.max(0, drinkUnits));
  const revenue = Math.round(served * avgPrice * opt.mul);
  const wages = q.staff * QUAN_NUOC_WAGE;
  return { customers, wanted, served, revenue, wages, profit: revenue - wages };
}

export interface QuanNuocHealth {
  /** Tổng đơn vị đồ uống hiện trong kho (chung với kệ tiệm chính) — mồi cân kho. */
  drinkUnitsNow: number;
  /** Số ly quán tiêu HÔM QUA (= served) — cho biết mức lấn kho. */
  consumedYesterday: number;
  /** Doanh thu bỏ lỡ hôm qua vì kho thiếu (~Zđ, dùng giá/mul hiện tại) — 0 khi bán đủ. */
  missedRevenue: number;
  shortYesterday: boolean;
  /** Dự phóng ĐÊM NAY (cùng kho + giá hiện tại) ở mức nhân viên hiện tại. */
  tonight: QuanNuocProjection;
  /** Dự phóng đêm nay nếu tuyển thêm 1 người (null khi đã đủ MAX). */
  hire: QuanNuocProjection | null;
  /** Lợi nhuận tăng thêm nếu tuyển thêm 1 người (lời hơn → dương; lỗ thêm → âm). */
  hireMarginal: number | null;
  /** Kho chỉ đủ cho đêm nay — quán sẽ ăn sạch, kệ tiệm chính cạn nước/rủi ro cạn. */
  driesMain: boolean;
}

/**
 * Mồi quyết định quán nước — đọc `quanNuocLast` (Hôm qua) + `storage` (kho hiện tại)
 * + `q` (cấu hình hiện tại) + `level`. Trả phân tích thuần; UI chỉ hiện khi quán mở
 * và có tín hiệu (short / lỗ / cạn kho) để không nhiễu ngày sạch.
 */
export function quanNuocHealth(
  q: QuanNuocState, level: number, storage: Record<string, number>, last?: { served?: number; wanted?: number } | null,
): QuanNuocHealth {
  const drinkUnits = quanNuocDrinkIds(level).reduce((n, id) => n + (storage[id] ?? 0), 0);
  const tonight = quanNuocProjection(q, level, drinkUnits);
  const hire = q.staff < QUAN_NUOC_MAX_STAFF ? quanNuocProjection({ ...q, staff: q.staff + 1 }, level, drinkUnits) : null;
  const hireMarginal = hire ? hire.profit - tonight.profit : null;
  const shortYesterday = !!last && typeof last.wanted === 'number' && typeof last.served === 'number' && last.served < last.wanted;
  const missedRevenue = shortYesterday ? Math.round(((last!.wanted as number) - (last!.served as number)) * quanNuocAvgSell(level) * QUAN_PRICE_OPTIONS[q.price].mul) : 0;
  return {
    drinkUnitsNow: drinkUnits,
    consumedYesterday: typeof last?.served === 'number' ? last.served : 0,
    missedRevenue,
    shortYesterday,
    tonight,
    hire,
    hireMarginal,
    driesMain: q.open && q.staff > 0 && drinkUnits < tonight.wanted,
  };
}
