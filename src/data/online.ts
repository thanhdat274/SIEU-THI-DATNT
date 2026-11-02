/**
 * Bán hàng online qua app: đăng ký gian hàng một lần, đơn từ khắp quận đổ về theo điểm đánh giá trên app.
 * Mỗi đơn có quãng đường; chủ chọn cho nhân viên giao hàng của tiệm chở (miễn phí nhưng chậm, mỗi người
 * một đơn một lúc) hoặc gọi Grab (nhanh, mất phí theo km). App ăn hoa hồng mỗi đơn. Giao đúng hẹn được
 * 5★, trễ thì sao thấp; điểm app thấp thì ít đơn hẳn.
 * Chỉ có dữ liệu và hàm thuần; áp vào trạng thái ở `core/slices/online`.
 */
import type { Lot } from './freshness';
import { productById, unlockedProducts } from './products';
import { skillSpeed } from './staff';
import { simRng } from '../core/rand';

export const ONLINE_UNLOCK = 10;
/** Phí mở gian hàng trên app (trả một lần). */
export const ONLINE_OPEN_COST = 500000;
/** App lấy hoa hồng chừng này phần mỗi đơn (bậc 0 — gian hàng mới). */
export const APP_COMMISSION = 0.12;

/** Bậc gian hàng theo số đơn app đã giao trọn đời — đơn ngày ở tiệm và đơn đêm chi nhánh cùng hồ sơ app.
 *  Bậc cao hơn = hoa hồng thấp hơn (app tri ân gian hàng uy tín); chỉ là giảm phí, không đổi giá bán. */
export interface AppTier { at: number; name: string; commission: number; }
export const APP_TIERS: AppTier[] = [
  { at: 0, name: 'Gian hàng mới', commission: 0.12 },
  { at: 50, name: 'Quán quen app', commission: 0.11 },
  { at: 150, name: 'Gian hạng bạc', commission: 0.1 },
  { at: 400, name: 'Gian hạng vàng', commission: 0.09 },
];
/** Bậc hiện có của gian hàng theo số đơn đã giao. */
export const appTier = (done: number): AppTier => {
  let t = APP_TIERS[0];
  for (const it of APP_TIERS) if (done >= it.at) t = it;
  return t;
};
/** Hoa hồng app trả cho đơn theo bậc hiện có (phần app giữ lại). */
export const appCommission = (done: number): number => appTier(done).commission;
/** Tiền thật nhận cho đơn trị giá `value` sau hoa hồng theo bậc — khớp công thức các nơi giao. */
export const appPay = (value: number, done: number): number => Math.round(value * (1 - appCommission(done)));

/** Sự kiện một ngày ở mảng app (GĐ717, pattern GĐ703/711/712): rút cho NGÀY MAI khi chốt ngày.
 *  🚀 khuyến mãi sàn — đơn đổ về dày hơn (khoảng cách ×0,65); 🛵 Grab đắt đỏ — phí Grab ×1,5.
 *  Chỉ hiệu chỉnh nhịp đơn/phí giao của ngày đó, không đụng giá bán hay điểm app. */
export type OnlineDayEvent = 'promo' | 'grabSurge';
export const ONLINE_EVENT_PROMO_P = 0.06;
export const ONLINE_EVENT_SURGE_P = 0.05;
/** Băm riêng cho sự kiện app — KHÔNG rút từ dòng simRng chung (mẫu eventOn/weatherSeed): mô phỏng cũ
 *  và số mốc simGolden không lệch vì thêm sự kiện; cùng seed + cùng ngày luôn ra cùng sự kiện. */
function roll(seed: number, n: number, salt: number): number {
  let h = Math.imul((seed >>> 0) ^ Math.imul(n, 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Sự kiện app của ngày `day` theo seed ván (salt 3701 — lệch khỏi salt của eventOn). */
export function onlineDayEvent(seed: number, day: number): OnlineDayEvent | undefined {
  const r = roll(seed, day, 3701);
  return r < ONLINE_EVENT_PROMO_P ? 'promo' : r < ONLINE_EVENT_PROMO_P + ONLINE_EVENT_SURGE_P ? 'grabSurge' : undefined;
}
/** Hệ số khoảng cách 2 đơn theo sự kiện hôm nay (khuyến mãi → đơn dày). */
export const eventGapMul = (ev?: OnlineDayEvent) => (ev === 'promo' ? 0.65 : 1);
/** Hệ số phí Grab theo sự kiện hôm nay (Grab đắt đỏ → ×1,5). */
export const eventGrabMul = (ev?: OnlineDayEvent) => (ev === 'grabSurge' ? 1.5 : 1);
/** Dòng tin sáng mai / thẻ panel cho sự kiện online (≤90 ký tự; không có sự kiện → rỗng). */
export const onlineEventLine = (ev?: OnlineDayEvent) =>
  ev === 'promo'
    ? '🚀 Hôm nay app khuyến mãi — đơn app đổ về dày hơn thường ngày'
    : ev === 'grabSurge'
      ? '🛵 Hôm nay Grab tăng giá cước +50% — cân nhắc cho người tiệm chở'
      : '';

/** Khách quen đặt app (GĐ718): thân thiết từ mốc này mới ghé qua app. */
export const ONLINE_REGULAR_FRIENDSHIP = 30;
/** Xác suất một đơn app là của khách quen (khi có khách đủ thân). */
export const ONLINE_REGULAR_CHANCE = 0.25;
export interface OnlineRegularRef { id: string; name: string; favorites: string[] }
/** Có khách quen nào đủ thân đặt app không — soát TRƯỚC để không rút rng khi không cần
 *  (không có ứng viên thì dòng mô phỏng cũ giữ nguyên từng nhịp — bài học simGolden GĐ717). */
export function hasOnlineRegularCandidate(regulars: Record<string, { friendship: number } | undefined>, level: number, byId: (id: string) => { unlock: number } | undefined): boolean {
  return Object.entries(regulars).some(([id, p]) => (p?.friendship ?? 0) >= ONLINE_REGULAR_FRIENDSHIP && (byId(id)?.unlock ?? 99) <= level);
}
/** Chọn khách quen cho đơn app bằng MỘT lần rút: roll < 25% thì có khách quen, đồng thời roll chọn người
 *  (cùng seed cùng người). Chỉ tính khách thân ≥ mốc và đã mở khoá theo cấp tiệm. */
export function pickOnlineRegular(regulars: Record<string, { friendship: number } | undefined>, level: number, roll: number, byId: (id: string) => { id: string; name: string; favorites: string[]; unlock: number } | undefined): OnlineRegularRef | undefined {
  const cands = Object.entries(regulars)
    .filter(([id, p]) => (p?.friendship ?? 0) >= ONLINE_REGULAR_FRIENDSHIP && (byId(id)?.unlock ?? 99) <= level);
  if (!cands.length || roll >= ONLINE_REGULAR_CHANCE) return undefined;
  const [id] = cands[Math.floor((roll / ONLINE_REGULAR_CHANCE) * cands.length)];
  const def = byId(id);
  return def ? { id: def.id, name: def.name, favorites: def.favorites } : undefined;
}
/** App chỉ nhận đơn trong khung giờ này (phút trong ngày). */
export const ONLINE_HOURS: [number, number] = [7 * 60, 21 * 60 + 30];
/** Đơn mới chờ tiệm nhận tối đa chừng này phút rồi app tự huỷ. */
export const ACCEPT_WINDOW = 20;
/** Giao trễ quá hạn chừng này phút thì khách chấm thấp nhất. */
export const VERY_LATE = 30;

export interface OnlineOrder {
  id: number;
  customer: string;
  items: Record<string, number>;
  km: number;
  placedAt: number;
  /** Hẹn giao trước giờ này. */
  dueAt: number;
  status: 'new' | 'shipping';
  /** Loại đặc biệt: 'rush' = gấp (hẹn rất sớm, giỏ nhỏ, gần) · 'bulk' = lớn (một món 6–10 phần, hẹn thoáng).
   *  Không set = đơn thường; bản lưu cũ thiếu trường coi như đơn thường (không cần migration). */
  kind?: 'rush' | 'bulk';
  /** Đặt bởi khách quen này (GĐ718): giao đúng hẹn +2 thân thiết, trễ −2; bản lưu cũ thiếu = khách vãng lai. */
  regularId?: string;
  via?: 'own' | 'grab';
  /** Giờ hàng tới tay khách. */
  arriveAt?: number;
  lots?: Record<string, Lot[]>;
}

export interface OnlineState {
  open: boolean;
  orders: OnlineOrder[];
  /** Phút trong ngày đơn kế tiếp đổ về. */
  nextAt: number;
  ratingSum: number;
  ratingCount: number;
  done: number;
  late: number;
  nextId: number;
  /** Sự kiện một ngày đang áp dụng (endDay rút cho ngày mai; bản lưu cũ thiếu = không có — GĐ717). */
  event?: OnlineDayEvent;
  /** Doanh thu online hôm nay (sau hoa hồng, trước phí Grab) và phí Grab. */
  revenueToday: number;
  grabFeesToday: number;
}

export const newOnline = (): OnlineState => ({
  open: false, orders: [], nextAt: 0, ratingSum: 0, ratingCount: 0, done: 0, late: 0, nextId: 1, revenueToday: 0, grabFeesToday: 0,
});

/** Điểm trên app (chưa ai chấm thì 5★ như gian hàng mới). */
export const appRating = (o: OnlineState) => (o.ratingCount ? o.ratingSum / o.ratingCount : 5);

/** Khoảng cách trung bình giữa hai đơn (phút): cấp cao, điểm tốt thì đơn dày hơn; sự kiện hôm nay nhân thêm. */
export function orderGap(rating: number, level: number, gapMul: number = 1) {
  const base = Math.max(35, 95 - level);
  return base * (rating >= 4.5 ? 1 : rating >= 4 ? 1.4 : rating >= 3 ? 2.2 : 4) * gapMul;
}

/** Mô tả mức độ "dày đơn" theo điểm app — mồi minh bạch cho người chơi hiểu hộp đen đơn app. */
export function orderRateTone(rating: number): string {
  if (rating >= 4.5) return 'đơn dày (rất đông khách app)';
  if (rating >= 4) return 'đơn khá đều';
  if (rating >= 3) return 'đơn thưa hơn';
  return 'đơn rất thưa — điểm thấp!';
}

/**
 * Số lượng đơn tối đa gần đúng app có thể trút về một ngày (độ rộng khung giờ / khoảng cách 2 đơn).
 * Dùng để hiển thị mức "dày đơn" minh bạch; đồng thời đúng là trần thực mà updateOnline chạm tới.
 */
export function onlineOrderCap(rating: number, level: number, gapMul: number = 1): number {
  const span = ONLINE_HOURS[1] - ONLINE_HOURS[0];
  return Math.round(span / orderGap(rating, level, gapMul));
}

/** Nhân viên tiệm chở bằng xe máy: phút tới nơi theo km và tay nghề. */
export const ownTravel = (km: number, skill: number) => Math.round(5 + (km * 6) / skillSpeed(skill));
/** Grab: tới nhanh, có sẵn ngay; sự kiện "Grab đắt đỏ" nhân phí (GĐ717). */
export const grabTravel = (km: number) => Math.round(8 + km * 4);
export const grabFee = (km: number, mul: number = 1) => Math.round(((8000 + km * 4000) * mul) / 1000) * 1000;

const NAMES = ['Chị Mai Q.7', 'Anh Tuấn Q.3', 'Bạn Hân', 'Cô Lệ', 'Anh Khoa', 'Chị Thu', 'Em Bảo', 'Chú Sáu', 'Chị Hồng', 'Anh Phát'];

/** Nhãn loại đơn cho tin báo: gấp / lớn; đơn thường không có đuôi. */
export const orderKindTag = (kind?: 'rush' | 'bulk') => (kind === 'rush' ? ' (gấp)' : kind === 'bulk' ? ' (lớn)' : '');

/** Tạo một đơn app: 1–3 món đang mở khoá (không phải món nhà làm nếu cấp đã mở), 1–8 km.
 *  GĐ715: ~16% đơn GẤP — gần (1–5 km), giỏ nhỏ 1–2 phần, hẹn rất sớm: Grab luôn kịp, người giao tay nghề
 *  thấp hoặc nhận muộn thì trễ (quyết định trả phí Grab hay chịu mất điểm). ~12% đơn LỚN — một món
 *  6–10 phần, hẹn thoáng thêm 30′: cửa ở kho có đủ hàng (trừ kho như thường, chấp nhận để nguyên kho khách quầy).
 *  GĐ718: `regular` truyền vào thì đơn là của khách quen — tên khách là người thật, giỏ nghiêng về món
 *  khách ưa (chỉ chọn món đang mở khoá; không trùng món ưa nào thì về giỏ thường). */
export function makeOnlineOrder(id: number, level: number, minutes: number, rng: () => number = simRng(), regular?: OnlineRegularRef): OnlineOrder {
  const pool = unlockedProducts(level);
  const kr = rng();
  const kind: OnlineOrder['kind'] = kr < 0.16 ? 'rush' : kr < 0.28 ? 'bulk' : undefined;
  const favPool = regular ? pool.filter((p) => regular.favorites.includes(p.id)) : [];
  const items: Record<string, number> = {};
  if (kind === 'rush' || kind === 'bulk') {
    const src = regular && favPool.length ? favPool : pool;
    const p = src[Math.floor(rng() * src.length)];
    if (p) items[p.id] = kind === 'rush' ? 1 + Math.floor(rng() * 2) : 6 + Math.floor(rng() * 5);
  } else if (regular && favPool.length) {
    for (let n = 1 + Math.floor(rng() * 2); n > 0 && favPool.length; n--) {
      const p = favPool[Math.floor(rng() * favPool.length)];
      items[p.id] = (items[p.id] ?? 0) + 1 + Math.floor(rng() * 3);
    }
  } else {
    for (let n = 1 + Math.floor(rng() * 3); n > 0 && pool.length; n--) {
      const p = pool[Math.floor(rng() * pool.length)];
      items[p.id] = (items[p.id] ?? 0) + 1 + Math.floor(rng() * 4);
    }
  }
  const km = Math.round((1 + rng() * (kind === 'rush' ? 4 : 7)) * 10) / 10;
  // Hẹn giao: thường = 20′ nhận + 20′ đường; gấp co còn 10′ + đường ngắn; lớn thoáng thêm 30′
  const due = ACCEPT_WINDOW + (kind === 'rush' ? 10 + Math.round(km * 3) : kind === 'bulk' ? 50 + km * 8 : 20 + km * 8);
  return {
    id,
    customer: regular ? regular.name : NAMES[Math.floor(rng() * NAMES.length)],
    items, km, placedAt: Math.round(minutes),
    dueAt: Math.round(minutes + due), status: 'new', ...(kind ? { kind } : {}), ...(regular ? { regularId: regular.id } : {}),
  };
}

/** Tiền hàng của đơn theo giá bán của tiệm. */
export const onlineValue = (o: OnlineOrder, priceOf: (id: string) => number) =>
  Object.entries(o.items).reduce((n, [id, q]) => n + priceOf(id) * q, 0);

/** Số sao khách chấm theo giờ hàng tới. */
export const deliveryStars = (o: OnlineOrder, arriveAt: number) =>
  arriveAt <= o.dueAt ? 5 : arriveAt <= o.dueAt + VERY_LATE ? 3 : 1;

export const describeOnline = (o: OnlineOrder) =>
  Object.entries(o.items).map(([id, q]) => `${q} ${productById(id).name}`).join(', ');

/** Giá vốn hàng của đơn (Σ q × giá nhập) — khớp căn bản checkout sales.ts (productById(id).buy). */
export const orderCost = (o: OnlineOrder): number =>
  Object.entries(o.items).reduce((n, [id, q]) => n + q * productById(id).buy, 0);

/**
 * Lãi ròng của đơn (chưa trừ phí giao): doanh thu sau hoa hồng − giá vốn hàng.
 * Gross dùng Math.round(onlineValue×(1−commission)) — đúng số tiệm THỰC nhận khi giao (slices/online);
 * truyền `commission` = hoa hồng theo bậc hiện có (appCommission(online.done)) để khớp số thật.
 */
export const orderNet = (o: OnlineOrder, priceOf: (id: string) => number, commission: number = APP_COMMISSION): number =>
  Math.round(onlineValue(o, priceOf) * (1 - commission)) - orderCost(o);

export interface OrderAssessment {
  /** Tiền thật nhận được sau hoa hồng (đúng số khi giao). */
  gross: number;
  /** Giá vốn hàng. */
  cost: number;
  /** Lãi ròng chưa phí giao. */
  net: number;
  /** net/gross — âm khi lỗ. */
  margin: number;
  /** net − phí Grab (lãi nếu gọi Grab). */
  grabNet: number;
  /** Phút tự giao (0 khi không có người giao rảnh). */
  ownTravelT: number;
  /** Phút gọi Grab. */
  grabTravelT: number;
  /** Sao nếu tự giao (5/3/1). */
  ownStars: number;
  /** Grab luôn 5★ (không thể trễ). */
  grabStars: number;
  /** Tự giao có trễ hẹn không (now + ownTravelT > dueAt). */
  urgent: boolean;
}

/** Đánh giá kinh tế + thời điểm của một đơn: giúp quyết lấy / lấy qua Grab / từ chối. Thuần đọc, không đổi state.
 *  `commission` — hoa hồng theo bậc hiện có (appCommission(online.done)); mặc định bậc 0 để test cũ không vỡ. */
export function orderAssessment(o: OnlineOrder, priceOf: (id: string) => number, courierSkill: number | null, minutes: number, commission: number = APP_COMMISSION, grabMul: number = 1): OrderAssessment {
  const gross = Math.round(onlineValue(o, priceOf) * (1 - commission));
  const cost = orderCost(o);
  const net = gross - cost;
  const ownTravelT = courierSkill == null ? 0 : ownTravel(o.km, courierSkill);
  const grabTravelT = grabTravel(o.km);
  return {
    gross, cost, net,
    margin: gross > 0 ? net / gross : 0,
    grabNet: net - grabFee(o.km, grabMul),
    ownTravelT, grabTravelT,
    ownStars: deliveryStars(o, minutes + ownTravelT),
    grabStars: 5,
    urgent: minutes + ownTravelT > o.dueAt,
  };
}

/** Điểm app sau khi giao đúng/stars (5/3/1) — mồi minh bạch payoff 1 đơn. Rỗng ratingCount → như gian hàng mới. */
export function ratingImpact(stars: number, online: OnlineState): { nextRating: number; tone: string } {
  const next = (online.ratingSum + stars) / (online.ratingCount + 1);
  return { nextRating: next, tone: orderRateTone(next) };
}

/** Điểm app nếu TỪ CHỐI đơn này (nhánh 4.5 như declineOnline) — từ chối vẫn mất chút điểm. */
export function declineRating(online: OnlineState): { nextRating: number; tone: string } {
  const next = (online.ratingSum + 4.5) / (online.ratingCount + 1);
  return { nextRating: next, tone: orderRateTone(next) };
}
