import { festivalOn, isWeekend } from './calendar';
/**
 * Quán nước đầu ngõ (GĐ7): địa điểm kinh doanh thứ hai, mở ở cấp 29, chuyên bán ĐỒ UỐNG rút nguyên liệu
 * từ kho chung (ăn vào chuỗi giá trị trại → kho → quán). Khác với chi nhánh tiện lợi (mô phỏng ngầm theo
 * bước 10 phút), quán nước chạy THEO NGÀY: mỗi lần sang ngày mới, `endDay` gọi đúng một lần `quanNuocDay`
 * — thiết kế tường minh, không dùng Math.random nên kết quả luôn xác định, dễ test.
 * File này chỉ có dữ liệu và hàm thuần; hành động mua/tuyển nằm ở `core/slices/quanNuoc.ts`.
 */
import { productById, unlockedProducts } from './products';
import type { Weather } from './weather';
import { brewMenu, cleanMenu, quanRecipeById, varietyMul, quanHotMul, QUAN_MENU_SLOTS } from './quanRecipes';

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

/** Khách quán nước theo thời tiết (GĐ414): nắng khát nước đông hơn, mưa bão vắng. Không truyền = ×1. */
export const QUAN_WEATHER_MUL: Record<Weather, number> = { sunny: 1.25, cloudy: 1, rain: 0.75, storm: 0.45, fog: 0.9 };
export const weatherMul = (w?: Weather) => (w ? QUAN_WEATHER_MUL[w] ?? 1 : 1);

/** `menu` (GĐ415): id công thức pha chế trên thực đơn; trống = chỉ bán nước chai như cũ. Save cũ thiếu = []. */
export interface QuanNuocState { open: boolean; staff: number; price: QuanNuocPrice; menu?: string[]; /** GĐ428: bậc cửa hàng 0 quầy, 1 quán, 2 cà phê. */ tier?: number; /** GĐ427: mẻ tự pha ở quầy hôm nay. */ hand?: { day: number; n: number } }
export const newQuanNuoc = (): QuanNuocState => ({ open: false, staff: 0, price: 'vua' });

/** Trạng thái hình ảnh của quán nước trong thế giới 3D đầu hẻm. */
export type QuanNuocStandState = 'hidden' | 'lot' | 'open';
export function quanNuocStandState(level: number, open: boolean): QuanNuocStandState {
  if (open) return 'open';
  if (level >= QUAN_NUOC_UNLOCK) return 'lot';
  return 'hidden';
}

/** Kết quả một ngày bán của quán nước (ghi lại phần phục vụ được để báo tin sáng mai). */
export interface QuanNuocDay {
  revenue: number; customers: number; served: number; wanted: number; wages: number; short: boolean;
  /** Ly pha chế theo món (GĐ415) và các món thiếu nguyên liệu hôm nay. */
  brewed: Record<string, number>; brewShort: string[];
  /** GĐ703: sự kiện bất ngờ hôm nay (máy pha hỏng / xe nước đối diện) — không có thì undefined. */
  event?: QuanNuocEventKind;
}

/** GĐ703 — sự kiện một ngày ở quán nước: endDay truyền rng (simRng) mới có; không truyền = không sự kiện
 *  (giữ hành vi cũ cho các test/projection không cần). Xác định hoàn toàn theo seed, không Math.random. */
export const QUAN_EVENT = { brewer: 0.06, cart: 0.05 };
export type QuanNuocEventKind = 'brewer' | 'cart';

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
 *  - GĐ703: truyền `rng` thì có sự kiện — máy pha hỏng (pha được nửa số ly món pha) hoặc xe nước
 *    đối diện (khách −20%). Hai lần gieo luôn được gọi đủ để thứ tự rng không phụ thuộc thực đơn.
 * Trả về null khi quán chưa mở.
 */
export function quanNuocDay(
  q: QuanNuocState, level: number, storage: Record<string, number>, take: (id: string, qty: number) => void, weather?: Weather, day?: number, rng?: () => number,
): QuanNuocDay | null {
  if (!q.open) return null;
  const drinks = quanNuocDrinkIds(level);
  const opt = QUAN_PRICE_OPTIONS[q.price];
  const menu = cleanMenu(q.menu, level, quanMenuSlots(q));
  // GĐ703: gieo 2 lần trước — có sự kiện nào không phải phụ thuộc menu.length
  const r1 = rng?.(), r2 = rng?.();
  const event: QuanNuocEventKind | undefined =
    r1 !== undefined && r1 < QUAN_EVENT.brewer && menu.length > 0 ? 'brewer'
    : r2 !== undefined && r2 < QUAN_EVENT.cart ? 'cart' : undefined;
  // Giá bán trung bình nước chai đã mở: tính một lần rồi nhân hệ số mức giá
  const avgPrice = drinks.length ? drinks.reduce((n, id) => n + productById(id).sell, 0) / drinks.length : 0;
  const customers = Math.round(45 * opt.traffic * quanTierMul(q) * (1 + 0.15 * q.staff) * weatherMul(weather) * varietyMul(menu.length) * quanWeekendMul(day) * quanMatchMul(day, weather) * quanHotMul(menu, weather, day) * (event === 'cart' ? 0.8 : 1));
  const wanted = Math.ceil(customers * 1.5);
  // Món pha chế phục vụ trước; khách còn lại mua nước chai. Máy pha hỏng → pha chậm, nửa số ly món pha
  const brew = brewMenu(menu, storage, event === 'brewer' ? Math.ceil(wanted / 2) : wanted, opt.mul, take);
  const rest = wanted - brew.total;
  const have = drinks.reduce((n, id) => n + (storage[id] ?? 0), 0);
  const bottled = Math.min(rest, have);
  // Rút kho: món tồn nhiều nhất trước, đủ số ly phục vụ thì dừng
  let left = bottled;
  for (const id of [...drinks].sort((a, b) => (storage[b] ?? 0) - (storage[a] ?? 0))) {
    if (left <= 0) break;
    const n = Math.min(left, storage[id] ?? 0);
    if (n > 0) { take(id, n); left -= n; }
  }
  const served = brew.total + bottled;
  return {
    revenue: brew.revenue + Math.round(bottled * avgPrice * opt.mul),
    customers, served, wanted,
    wages: q.staff * QUAN_NUOC_WAGE,
    short: served < wanted,
    brewed: brew.cups, brewShort: brew.short, event,
  };
}

/** GĐ707 — dòng tin sáng mai của quán nước: giữ ≤90 ký tự, sự kiện không bao giờ bị thay
 *  bằng dòng "kho thiếu" sai (lỗi tiềm ẩn GĐ703: ngày có sự kiện mà dòng quá dài thì fallback
 *  cũ kể "kho thiếu" dù kho đủ). `head` là phần số liệu endDay dựng; hàm chỉ lo phần đuôi. */
export function quanDayNews(head: string, q: QuanNuocDay): string {
  const ev = q.event === 'brewer' ? ' · ⚙️ máy pha hỏng, pha chậm' : q.event === 'cart' ? ' · 🛺 xe nước mọc đối diện' : '';
  const tail = ev
    || (q.brewShort.length ? ` · thiếu ${quanRecipeById(q.brewShort[0])?.name ?? q.brewShort[0]}${q.brewShort.length > 1 ? ` +${q.brewShort.length - 1}` : ''}` : '')
    || (q.short ? ' · kho thiếu đồ uống, nhập thêm' : '');
  const line = head + tail;
  if ([...line].length <= 90) return line;
  const extra = ev || (q.brewShort.length ? ` · thiếu ${q.brewShort.length} món` : ' · kho thiếu');
  const short = head + extra;
  if ([...short].length <= 90) return short;
  // head quá dài (doanh thu nhiều chữ + tự pha + trận): cắt ĐẦU head, giữ đuôi quan trọng — trần 90 cứng (Luật 9)
  const hTrim = [...head].slice(0, Math.max(0, 90 - [...extra].length - 1)).join('') + '…';
  return hTrim + extra;
}

/** Số khách ngồi trong quán 3D (GĐ426): theo số ly bán hôm qua, mỗi 12 ly một khách, tối đa 2 ghế/bàn. */
export const quanPatrons = (staff: number, servedYesterday: number | undefined) =>
  Math.min(2 * Math.max(0, Math.min(3, Math.floor(staff))), Math.ceil(Math.max(0, servedYesterday ?? 0) / 12));

/** GĐ427 — tự pha ở quầy: mỗi mẻ 5 ly bán ngay cho khách đang chờ, tối đa 3 mẻ/ngày, tiền thưởng tay nghề +20%. */
export const QUAN_HAND_CUPS = 5;
export const QUAN_HAND_BATCHES = 3;
export const QUAN_HAND_BONUS = 1.2;
/** GĐ433: mỗi bậc cửa hàng thêm 1 mẻ tự pha/ngày (quầy 3, quán 4, cà phê 5). */
export const quanHandMax = (q: QuanNuocState) => QUAN_HAND_BATCHES + quanTierOf(q);
export const quanHandLeft = (q: QuanNuocState, day: number) => quanHandMax(q) - (q.hand?.day === day ? q.hand.n : 0);

/** GĐ428 — nâng bậc cửa hàng nước: quầy → quán → cà phê. Mỗi bậc kéo thêm khách, cần cấp và tiền. */
export const QUAN_TIERS = [
  { name: 'Quầy nước', icon: '🧋', mul: 1, level: 0, cost: 0 },
  { name: 'Quán nước', icon: '🪑', mul: 1.25, level: 33, cost: 15_000_000 },
  { name: 'Quán cà phê', icon: '☕', mul: 1.5, level: 38, cost: 40_000_000 },
] as const;
export const quanTierOf = (q: Pick<QuanNuocState, 'tier'>) => Math.max(0, Math.min(QUAN_TIERS.length - 1, Math.floor(q.tier ?? 0)));
export const quanTierMul = (q: Pick<QuanNuocState, 'tier'>) => QUAN_TIERS[quanTierOf(q)].mul;
/** GĐ467: cuối tuần (T7/CN) khách ngồi quán đông hơn ×1.2; không truyền ngày = ×1 (giữ số liệu cũ). */
export const QUAN_WEEKEND_MUL = 1.2;
/** GĐ581: tối có trận bóng (1 ngày thường/tuần, không mưa bão) → khách quán nước ×1,3. Theo số ngày nên chơi đơn/hẻm online như nhau. */
export const QUAN_MATCH_MUL = 1.3;
export const isQuanMatchDay = (day?: number, weather?: Weather) =>
  day !== undefined && weather !== 'storm' && weather !== 'rain'
  && ((day % 7 === 3 && !isWeekend(day)) || festivalOn(day)?.id === 'bong_da_phuong'); // GĐ586: cả giải bóng phường là đêm có trận
export const quanMatchMul = (day?: number, weather?: Weather) => (isQuanMatchDay(day, weather) ? QUAN_MATCH_MUL : 1);
export const quanWeekendMul = (day?: number) => (day !== undefined && isWeekend(day) ? QUAN_WEEKEND_MUL : 1);
/** GĐ449: quán cà phê (bậc 3) có thêm 1 ô thực đơn. */
export const quanMenuSlots = (q: Pick<QuanNuocState, 'tier'>) => QUAN_MENU_SLOTS + (quanTierOf(q) >= 2 ? 1 : 0);
