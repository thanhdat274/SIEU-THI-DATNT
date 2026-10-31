/**
 * Các hệ thống kinh doanh & đời sống thêm vào sau: tiệm đối thủ, thẻ tích điểm, quảng cáo, vay vốn, hụi,
 * báo cáo tuần, thú cưng, thành tựu, sự kiện bất ngờ, chuyện khách quen, nhà riêng, bữa sáng, xe cộ.
 * File này chỉ có dữ liệu và hàm thuần; hành động đổi trạng thái nằm ở `core/biz.ts`.
 */
import { formatMoney, productById } from './products';
import { newQuanNuoc, type QuanNuocState } from './quanNuoc';
import type { HiepLucState } from './hiepLuc';
import { monthOf } from './calendar';
import { emptyYear } from './yearReport';
import { xpToNext } from './levels';
import { simRng } from '../core/rand';

// ───────────────────────── Tiệm đối thủ ─────────────────────────

export interface Rival {
  name: string;
  /** 0–100: càng mạnh càng hút khách của mình; về 0 thì đóng cửa. */
  strength: number;
  openedDay: number;
  /** Đang chạy đợt giảm giá tới hết ngày này. */
  saleUntil?: number;
  /** Tính cách: phá giá (cutter), chơi chất lượng (quality) hay máu liều (aggressive). */
  personality?: RivalPersonality;
  /** Chuyện nền một câu của cửa hàng (thiếu ở rival cốt truyện và save cũ). */
  blurb?: string;
  /** Bảng giá rival đang bán từng món (chỉ bày món có trong bảng); thiếu ở save cũ. */
  prices?: Record<string, number>;
  /** Kho hàng của rival theo món (để bớt dần khi mình đánh mạnh). */
  stock?: Record<string, number>;
  /** Khách quen bị lôi kéo sang rival: id → ngày bị lôi kéo. */
  poached?: Record<string, number>;
}

export type RivalPersonality = 'cutter' | 'quality' | 'aggressive';

export const RIVAL_PERSONALITIES: Record<RivalPersonality, { icon: string; name: string; desc: string }> = {
  cutter: { icon: '💸', name: 'Thích phá giá', desc: 'Luôn bán rẻ hơn mình vài phần trăm đúng món mình bán chạy nhất' },
  quality: { icon: '✨', name: 'Chơi chất lượng', desc: 'Không phá giá, kiên trì rót khách bằng phục vụ tốt — rất khó hạ nếu tiệm mình sơ suất' },
  aggressive: { icon: '😤', name: 'Máu liều', desc: 'Lôi kéo khách quen và sẵn sàng giựt cả nhân viên của mình' },
};

export const RIVAL_UNLOCK = 8;
/** Catalog 12 cửa hàng đối thủ xoay vòng theo thế hệ; 4 tên đầu là tên đời cũ giữ nguyên vị trí. */
export const RIVAL_SHOPS: { name: string; blurb: string }[] = [
  { name: 'Tạp hóa Phát Đạt', blurb: 'Ông chủ giữ tiệm từ thời bao cấp, nói chuyện với khách bằng trà đá và chưa để hỏng một thùng hàng nào.' },
  { name: 'Mini mart Hưng Thịnh', blurb: 'Kệ hàng sáng bong, nhạc ngoại rền cả ngày — ông chủ từng đi xếp hàng ở siêu thị lớn về mở riêng.' },
  { name: 'Tiệm Cô Ba Mới', blurb: 'Cô Ba bán đúng thứ xóm cần, đổi mặt hàng theo mùa nhanh hơn cả đổi thời tiết.' },
  { name: 'Cửa hàng 24h Ánh Dương', blurb: 'Chị chủ thức trắng đêm xem doanh số của tiệm mình để điều giá từng giờ.' },
  { name: 'Siêu thị Mini Quang Trung', blurb: 'Mới mở đã treo loa hô "giảm giá sâu" cả hẻm nghe rõ, poster dán kín cửa kính.' },
  { name: 'Chợ Xanh Đầu Ngõ', blurb: 'Bà con chợ cũ góp vốn chung tay, rau củ xếp thành tháp, mùi ngò rí bay sang tận tiệm mình.' },
  { name: 'Tạp Hóa Tám Sáng', blurb: 'Sáu giờ sáng đã mở cửa, chú Tám nhớ mặt từng khách đi làm và đoán trước họ cần mua gì.' },
  { name: 'Cửa Hàng Bà Sáu', blurb: 'Bà Sáu bán chịu cho cả xóm mười năm, cuốn sổ nợ dày hơn sách giáo khoa mà chưa đòi nổi ai.' },
  { name: 'Trung Tâm Thương Mại Hoàng Lan', blurb: 'Tầng một đầy hàng, tầng hai còn trống — cô Lan bảo để dành mở rộng sau khi hạ được tiệm mình.' },
  { name: 'Mart Năm Cầu', blurb: 'Mới khai trương đã treo băng rôn "rẻ nhất hẻm" ngay trước cửa tiệm mình, ai đi qua cũng ngẩng lên đọc.' },
  { name: 'Cửa Hàng Tân Kỷ', blurb: 'Chủ tiệm trẻ nhất xóm, quét mã thanh toán, livestream bán hàng ngay giữa hẻm đêm nào cũng lên sóng.' },
  { name: 'Siêu Thị Sao Mai', blurb: 'Nghe đồn có hậu phương công ty lớn: khai trương pháo đỏ rực, phát quà tận từng nhà trong xóm.' },
];
/**
 * Thế hệ trùm cuối của truyện rival (GĐ170): rival thứ 12 hạ được — cũng là mục cuối catalog
 * 'Siêu Thị Sao Mai' (blurb "hậu phương công ty lớn") — là đối thủ LỚN CUỐI CÙNG. Chương
 * ch13_sieu_thi_sao_mai khép truyện rival ở mốc này; từ gen 13 (rivalsBeaten ≥ 12) rival đời mới
 * chỉ là cửa hàng thường: tin khai trương khác nhãn + tên lặp vòng gắn hậu tố "cơ sở" (core/biz.ts).
 * Số này trùng RIVAL_SHOPS.length — giữ là hằng riêng để định nghĩa truyện không phụ thuộc catalog.
 */
export const RIVAL_BOSS_GEN = 12;
/** Bậc quy mô của rival theo thế hệ (gen = rivalsBeaten + 1 với rival mới): càng về sau cửa hàng càng lớn. */
export function rivalTier(gen: number): { label: string; icon: string } {
  if (gen >= 10) return { label: 'trung tâm thương mại', icon: '🏛️' };
  if (gen >= 6) return { label: 'chuỗi cửa hàng', icon: '🏢' };
  if (gen >= 3) return { label: 'mini mart', icon: '🏬' };
  return { label: 'cửa hàng', icon: '🏪' };
}
export const RIVAL_START = 60;
export const RIVAL_BEAT_REWARD = 800000;
export const RIVAL_BEAT_XP = 400;
/** Sau khi thắng, nghỉ chừng này ngày rồi mới có tiệm mới mở (mạnh hơn). */
export const RIVAL_COOLDOWN = 20;
/** Rival bán bao nhiêu món (bestseller của mình) mỗi đêm nhắm phá giá. */
export const RIVAL_TARGETS = 3;
/** Rival phá giá sâu từng này phần so với giá của mình (cutter sâu hơn). */
export const RIVAL_UNDERCUT = { cutter: 0.88, quality: 0.97, aggressive: 0.92 };
/** Khách quen thân thiết dưới mốc này có thể bị lôi kéo. */
export const POACH_FRIENDSHIP = 25;
/** Xác suất cơ bản mỗi đêm một khách quen bị lôi kéo (nhân theo sức mạnh rival). */
export const POACH_CHANCE = 0.05;
/** Rival mạnh quá mốc này mới dám giựt nhân viên (chỉ rival máu liều). */
export const STAFF_POACH_STRENGTH = 60;
export const STAFF_POACH_CHANCE = 0.04;
/** Mua lại mặt bằng rival: giá bán và số ngày giữ chào bán. */
export const RIVAL_SHOP_PRICE = 12000000;
export const RIVAL_SHOP_OFFER_DAYS = 10;
/** Mua lại xong: khách cũ của rival ghé tiệm mình thêm bấy nhiêu phần trong chừng này ngày. */
export const RIVAL_BUY_TRAFFIC = 1.15;
export const RIVAL_BUY_DAYS = 7;

// ───── Xu hướng sức mạnh đối thủ (GĐ60 "Rival đang tiến hay lui") ─────
/** Cửa sổ lăn nhật ký sức mạnh rival (nhịp tuần comeback, khác 14 ngày venue). */
export const RIVAL_TREND_DAYS = 7;
/** Vùng chết % để gọi rival 'gaining'/'fading' (cùng ngữ nghĩa venue/risk ≥3%). */
export const RIVAL_TREND_FLAT = 3;
/** Đòn bẩy ⭐: điểm đánh giá ≥ mốc này là ổn. */
export const LEVER_RATING = 4;
/** Đòn bẩy 🚚: tỉ lệ khách bỏ lỡ ≤ mốc này là ổn. */
export const LEVER_MISS_RATE = 0.15;
/** Đòn bẩy 🏷️: |chỉ số giá − 1| ≤ mốc này là ổn (giá không lệch giá gợi ý quá 5%). */
export const LEVER_PRICE_INDEX = 0.05;

/** Món rival đang bán rẻ hơn mình đáng kể (để khách nhạy giá chê mình đắt). */
export function rivalUndercuts(r: Rival | null, priceOf: (id: string) => number, day: number): Set<string> {
  const out = new Set<string>();
  if (!r?.prices) return out;
  const sale = r.saleUntil !== undefined && r.saleUntil >= day ? 0.95 : 1;
  for (const [id, rp] of Object.entries(r.prices)) {
    if (rp * sale < priceOf(id) * 0.95) out.add(id);
  }
  return out;
}

/**
 * Cảnh báo cạnh tranh cho HUD (GĐ42): rival đang bán rẻ ≥5% những món tiệm mình CÓ bày/bán
 * (lọc nhiễu — chỉ nhắc món mình thực sự đang giữ). Trả null khi chưa có rival hoặc không trúng món nào.
 */
export function rivalUndercutAlerts(
  r: Rival | null,
  priceOf: (id: string) => number,
  day: number,
  carried: Set<string>,
  n = 3,
): { rival: string; items: string[] } | null {
  if (!r) return null;
  const under = rivalUndercuts(r, priceOf, day);
  const matching = [...under].filter((id) => carried.has(id));
  if (!matching.length) return null;
  return { rival: r.name, items: matching.slice(0, n).map((id) => productById(id).name) };
}

/** Phần khách bị đối thủ hút đi: tối đa 25% khi đối thủ mạnh nhất, gấp đôi khi họ đang giảm giá. */
export function rivalTrafficFactor(r: Rival | null, day: number) {
  if (!r) return 1;
  const sale = r.saleUntil !== undefined && r.saleUntil >= day ? 2 : 1;
  return Math.max(0.5, 1 - (r.strength / 100) * 0.25 * sale);
}

/** Cuối ngày: tiệm mình phục vụ tốt (sao cao, ít lỡ bán, giá không đắt) thì đối thủ yếu dần. */
export function rivalNightly(r: Rival, ctx: { rating: number; missRate: number; priceIndex: number; adsActive: boolean }) {  let delta = 0;
  delta -= (ctx.rating - 3.5) * 4; // 5★ → −6, 3★ → +2
  delta += ctx.missRate * 20; // lỡ 30% lượt bán → +6
  delta += (ctx.priceIndex - 1) * 30; // đắt hơn giá gợi ý 10% → +3
  if (ctx.adsActive) delta -= 2;
  delta += 1; // đối thủ cũng tự quảng cáo mỗi ngày
  return Math.max(0, Math.min(100, r.strength + delta));
}

/** Một ngày ghi nhận trong nhật ký sức mạnh rival (append cuối ngày, cửa sổ lăn − RIVAL_TREND_DAYS). */
export interface RivalTrendDay {
  day: number;
  strength: number;
  /** Đổi từ ngày trước (âm = rival yếu đi). */
  delta: number;
}

export type RivalMomentum = 'gaining' | 'fading' | 'flat';

export interface RivalMomentumResult {
  dir: RivalMomentum;
  /** Sức mạnh mới nhất. */
  last: number;
  /** Sức mạnh ngày đầu cửa sổ. */
  start: number;
  /** Số ngày liên tiếp cùng hướng tính từ cuối. */
  streak: number;
  /** Tổng nửa gần − tổng nửa trước. */
  delta: number;
  /** % chênh nửa gần vs nửa trước. */
  pct: number;
}

/** Xu hướng sức mạnh rival trong cửa sổ: so tổng nửa gần vs nửa trước; |Δ| < RIVAL_TREND_FLAT% → flat. */
export function rivalMomentum(t: RivalTrendDay[]): RivalMomentumResult {
  const n = t.length;
  const empty: RivalMomentumResult = { dir: 'flat', last: 0, start: 0, streak: 0, delta: 0, pct: 0 };
  if (n === 0) return empty;
  const last = t[n - 1].strength;
  const start = t[0].strength;
  if (n < 2) return { ...empty, last, start }; // chưa đủ tín hiệu → trung tính nhưng vẫn báo mốc
  const half = Math.ceil(n / 2);
  const sum = (xs: RivalTrendDay[]) => xs.reduce((a, d) => a + d.strength, 0);
  const recent = sum(t.slice(n - half));
  const earlier = sum(t.slice(0, n - half));
  const delta = recent - earlier;
  const pct = earlier === 0 ? (recent > 0 ? 100 : 0) : Math.round((recent / earlier - 1) * 100);
  const dir: RivalMomentum = recent > earlier * (1 + RIVAL_TREND_FLAT / 100) ? 'gaining'
    : recent < earlier * (1 - RIVAL_TREND_FLAT / 100) ? 'fading'
    : 'flat';
  // Chuỗi cùng hướng tính từ ngày cuối (delta ngày-ngày), chỉ tính khi có hướng rõ.
  let streak = 0;
  if (dir === 'gaining') for (let i = n - 1; i > 0 && t[i].delta > 0; i--) streak++;
  else if (dir === 'fading') for (let i = n - 1; i > 0 && t[i].delta < 0; i--) streak++;
  return { dir, last, start, streak, delta, pct };
}

/** 4 đòn bẩy hằng ngày quyết định sức mạnh rival (khớp đúng công thức rivalNightly ở core/biz). */
export interface RivalLeverCtx {
  /** Điểm đánh giá hiện tại (cùng nguồn rivalNightly). */
  rating: number;
  /** Tỉ lệ khách bỏ lỡ (missed / (missed + itemsSold)). */
  missRate: number;
  /** Chỉ số giá bán (mean giá/gợi ý; 1 = sát). */
  priceIndex: number;
  /** Đang có quảng cáo hoạt động ngày hôm nay. */
  adsActive: boolean;
}

export interface RivalLeverFlag {
  lever: 'rating' | 'miss' | 'price' | 'ads';
  label: string;
  ok: boolean;
}

/** Tính ✅/❌ 4 đòn bẩy của bạn từ số liệu sống — mồi "sửa cái nào" khi rival đang tiến. Thuần đọc. */
export function rivalLeverFlags(ctx: RivalLeverCtx): RivalLeverFlag[] {
  return [
    { lever: 'rating', label: '⭐ Sao ≥ 4', ok: ctx.rating >= LEVER_RATING },
    { lever: 'miss', label: '🚚 Bỏ lỡ ≤ 15%', ok: ctx.missRate <= LEVER_MISS_RATE },
    { lever: 'price', label: '🏷️ Giá sát gợi ý ±5%', ok: Math.abs(ctx.priceIndex - 1) <= LEVER_PRICE_INDEX },
    { lever: 'ads', label: '📢 Có quảng cáo', ok: ctx.adsActive },
  ];
}

/** Ai đang nắm đầu: theo momentum (thắng nếu rival yếu dần), flat thì theo sức mạnh tuyệt đối. */
export function rivalStanding(t: RivalTrendDay[], strength: number): 'ahead' | 'even' | 'behind' {
  const m = rivalMomentum(t);
  if (m.dir === 'gaining') return 'behind';
  if (m.dir === 'fading') return 'ahead';
  if (strength >= 75) return 'behind';
  if (strength <= 40) return 'ahead';
  return 'even';
}

/** Tạo một rival ngẫu nhiên tính cách; có `avoid` thì loại tính cách vừa gặp khỏi vòng quay (pool còn mới rút lại). */
export function newRival(name: string, strength: number, openedDay: number, rng: () => number = simRng(), avoid?: RivalPersonality): Rival {
  const all: RivalPersonality[] = ['cutter', 'quality', 'aggressive'];
  const pool = avoid ? all.filter((p) => p !== avoid) : all;
  const personalities = pool.length ? pool : all;
  return { name, strength, openedDay, personality: personalities[Math.floor(rng() * personalities.length)] };
}

export interface RivalNightCtx {
  day: number;
  /** Sổ bán hôm nay của tiệm mình: rival nhắm đúng món bán chạy nhất. */
  byItem: Record<string, { qty: number }>;
  /** Giá bán hiện hành của tiệm mình (đã gồm giảm giá nếu có). */
  priceOf: (id: string) => number;
  /** Thân thiết của khách quen: người thân thiết dưới mốc có thể bị lôi kéo. */
  friendships: Record<string, number>;
  /** Hôm nay mình có chạy đợt tri ân khách quen không: khách bị lôi kéo có cơ hội quay lại. */
  giftCounter: boolean;
  /** Nhân viên đang làm (chỉ rival máu liều mới giựt). */
  staff: { id: number; name: string; skill: number }[];
  rng?: () => number;
}

export interface RivalNightResult {
  rival: Rival;
  news: string[];
  /** Nhân viên bị rival móc: loại khỏi danh sách ở tầng core. */
  poachedStaffId?: number;
  /** Khách quen quay lại tiệm mình (được cộng thêm thân thiết). */
  returned: string[];
}

/**
 * Đối thủ có não mỗi đêm: nhìn vào món mình bán chạy nhất để phá giá đúng món đó, lôi kéo khách quen
 * còn xa lạ, rival máu liều mạnh quá mốc thì giựt cả nhân viên. Đợt tri ân khách quen và rival yếu đi
 * là hai cách giành lại khách quen.
 */
export function rivalNightAI(r: Rival, ctx: RivalNightCtx): RivalNightResult {
  const rng = ctx.rng ?? simRng();
  const news: string[] = [];
  const pers = r.personality ?? 'cutter';
  const undercut = RIVAL_UNDERCUT[pers];
  const next: Rival = { ...r, prices: { ...r.prices }, stock: { ...r.stock }, poached: { ...r.poached } };
  next.poached = Object.fromEntries(Object.entries(next.poached ?? {}).filter(([id]) => ctx.friendships[id] !== undefined));

  // 1. Chọn mục tiêu: top món bán chạy của mình, rival bày hàng và giá dưới mình một chút
  const targets = Object.entries(ctx.byItem).sort((a, b) => b[1].qty - a[1].qty).slice(0, RIVAL_TARGETS)
    .filter(([id]) => ctx.priceOf(id) > 0);
  for (const [id] of targets) {
    const mine = ctx.priceOf(id);
    next.prices![id] = Math.max(100, Math.round((mine * undercut) / 100) * 100);
    next.stock![id] = Math.min(60, (next.stock![id] ?? 20) + 15);
  }
  // Món cũ không còn bán chạy: rival xả dần rồi ngừng bày
  for (const id of Object.keys(next.stock ?? {})) {
    if (targets.some(([t]) => t === id)) continue;
    next.stock![id] = (next.stock![id] ?? 0) - 8;
    if (next.stock![id]! <= 0) { delete next.stock![id]; delete next.prices![id]; }
  }
  if (targets.length) {
    const names = targets.slice(0, 2).map(([id]) => productById(id).name).join(', ');
    news.push(`⚔️ ${r.name} bày thêm hàng, bán rẻ đúng món ${names} của tiệm mình — xem giá họ ở Kinh doanh`);
  }

  // 2. Lôi kéo khách quen còn xa lạ (tối đa một người mỗi đêm)
  const poached = next.poached ?? {};
  const returned: string[] = [];
  const winBack = ctx.giftCounter || r.strength < 25;
  for (const id of Object.keys(poached)) {
    if (!winBack && rng() >= 0.25) continue;
    if (winBack || rng() < 0.5) {
      delete poached[id];
      returned.push(id);
      news.push(`💛 Một khách quen chán ${r.name}, quay lại tiệm mình!`);
    }
  }
  if (r.strength >= 35 && Object.keys(poached).length < 3) {
    const candidates = Object.entries(ctx.friendships)
      .filter(([id, f]) => f < POACH_FRIENDSHIP && !poached[id] && f !== undefined)
      .sort((a, b) => a[1] - b[1]);
    const victim = candidates[0];
    if (victim && rng() < POACH_CHANCE * (r.strength / 100) * (pers === 'aggressive' ? 1.6 : pers === 'quality' ? 0.5 : 1)) {
      poached[victim[0]] = ctx.day;
      news.push(`😠 Đáng tiếc: khách quen của mình bị ${r.name} kéo rớt giá mớ hàng rẻ hơn — ghé Mạng xã hội quảng bá và nhớ tri ân khách!`);
    }
  }

  // 3. Rival máu liều mạnh quá mốc thì móc nhân viên giỏi nhất của mình
  let poachedStaffId: number | undefined;
  if (pers === 'aggressive' && r.strength >= STAFF_POACH_STRENGTH && ctx.staff.length && rng() < STAFF_POACH_CHANCE) {
    const best = [...ctx.staff].sort((a, b) => b.skill - a.skill)[0];
    poachedStaffId = best.id;
    news.push(`⚔️ ${r.name} móc ${best.name} sang làm với lương gấp rưỡi! Vào lại tuyển người ở bảng Nhân viên`);
  }
  return { rival: next, news, poachedStaffId, returned };
}

// ───── Phản công đối thủ chủ động ─────

export type CounterTactic = 'price' | 'ad' | 'gift';

export interface CounterDef {
  id: CounterTactic;
  icon: string;
  name: string;
  /** Chi phí chạy đợt (0 = không trả trước, trả bằng lãi mỏng). */
  cost: number;
  /** Số ngày chờ trước khi dùng lại chiến thuật này. */
  cooldown: number;
  /** Sức mạnh đối thủ mất trong đêm nếu đợt hiệu quả. */
  hit: number;
  desc: string;
}

/** Ba cách đánh sức mạnh đối thủ trong ngày; mỗi ngày chạy được một đợt, mỗi cách có thời gian hồi. */
export const COUNTERS: CounterDef[] = [
  {
    id: 'price', icon: '💸', name: 'Đối đầu giá', cost: 0, cooldown: 3, hit: 9,
    desc: 'Hôm nay mọi giá bán trừ 10%: khách đông lên nhưng lãi mỏng. Đêm nay đối thủ mất 9 sức mạnh nếu hôm nay bán được ít nhất 30 món.',
  },
  {
    id: 'ad', icon: '📢', name: 'Quảng cáo xuyên hẻm', cost: 300000, cooldown: 4, hit: 6,
    desc: 'Treo băng rôn khắp hẻm kể về tiệm mình: hôm nay khách ghé đông thêm 12%, đêm nay đối thủ mất 6 sức mạnh.',
  },
  {
    id: 'gift', icon: '🎁', name: 'Tri ân khách quen', cost: 150000, cooldown: 5, hit: 4,
    desc: 'Tặng quà cho khách quen ghé hôm nay (+2 thân thiết mỗi người), đêm nay đối thủ mất 4 sức mạnh.',
  },
];

export const counterById = (id: CounterTactic) => COUNTERS.find((c) => c.id === id)!;

/** Đợt đối đầu giá "thắng" khi tiệm vẫn bán được chừng này món trong ngày giảm giá. */
export const PRICE_WAR_MIN_SALES = 30;
/** Tỉ lệ giảm giá niêm yết trong ngày đối đầu giá. */
export const PRICE_WAR_CUT = 0.1;
/** Khách ghé thêm trong ngày chạy quảng cáo xuyên hẻm. */
export const COUNTER_AD_TRAFFIC = 1.12;
/** Sau khi bị đánh, đối thủ có thể trả đũa bằng đợt giảm giá ngay ngày mai. */
export const COUNTER_RETAILIATE = 0.5;
export const COUNTER_RETAILIATE_BUFF = 2;
/** Đánh đối thủ nhiều ngày liền: mỗi ngày liên tiếp đòn nặng thêm 1 sức mạnh, tối đa bấy nhiêu. */
export const COUNTER_STREAK_MAX = 3;

/** Đợt phản công đang chạy (một ngày hiệu lực); null = hôm nay không chạy. */
export interface Counter { tactic: CounterTactic; day: number }

/** Đợt có hiệu lực hôm nay không (để đọc giá/traffic/ưu đãi). */
export const counterActive = (c: Counter | null | undefined, day: number, tactic: CounterTactic) =>
  !!c && c.day === day && c.tactic === tactic;

// ───────────────────────── Thẻ tích điểm ─────────────────────────

export interface Loyalty {
  on: boolean;
  /** Mua đủ chừng này lần thì món rẻ nhất trong giỏ được tặng. */
  stamps: 5 | 10 | 15;
  /** Số lần đã tặng và tổng tiền đã tặng. */
  redeemed: number;
  given: number;
}

export const LOYALTY_UNLOCK = 5;
export const LOYALTY_OPTIONS = [5, 10, 15] as const;
/** Tích càng ít tem càng hấp dẫn: +12% / +6% / +4% khách ghé. */
export const loyaltyTraffic = (l: Loyalty) => (l.on ? 1 + 0.6 / l.stamps : 1);
/** Mỗi lần tính tiền, xác suất khách vừa đủ tem để đổi quà. */
export const loyaltyRedeemChance = (l: Loyalty) => (l.on ? 1 / l.stamps : 0);

/**
 * GĐ129 — Chi phí–lợi ích Thẻ tích điểm: trả lời "thẻ có đáng không" bằng cách quy
 * quà đã tặng (chi phí) ra so với khách kéo thêm nhờ +% traffic (lợi ích). THUẦN ĐỌC
 * state có sẵn (loyalty.given/redeemed/stamps + stats.customers/revenue), không đổi
 * save/kinh tế. `extraCustomers` ước theo đúng pattern `happyHourReport` (khách ×(1−1/mul)).
 * Trả null khi tắt thẻ (không nhiễu); `verdict='soon'` khi chưa có lần đổi nào.
 */
export interface LoyaltyPayoff {
  avgGift: number;
  boostPct: number;
  extraCustomers: number;
  costToday: number;
  extraValue: number;
  net: number;
  verdict: 'keep' | 'reduce' | 'soon';
}
export function loyaltyPayoff(l: Loyalty, stats: { customers: number; revenue: number }): LoyaltyPayoff | null {
  if (!l.on) return null;
  const mul = loyaltyTraffic(l); // 1.12 / 1.06 / 1.04
  const boostPct = Math.round((mul - 1) * 100);
  const avgGift = l.redeemed ? l.given / l.redeemed : 0;
  const customers = Math.max(0, stats.customers);
  const revenue = Math.max(0, stats.revenue);
  // Khách ước tính nhờ thẻ: phần vượt nhịp tự nhiên (cùng trường phái happyHourReport)
  const extraCustomers = Math.round(customers * (1 - 1 / mul));
  // Chi phí quà hôm nay: ~customers/stamps lượt đổi × món rẻ nhất TB (given/redeemed)
  const redemptionsToday = customers / l.stamps;
  const costToday = Math.round(avgGift * redemptionsToday);
  const avgRevPerCustomer = customers ? revenue / customers : 0;
  const extraValue = Math.round(extraCustomers * avgRevPerCustomer);
  const net = extraValue - costToday;
  const verdict: LoyaltyPayoff['verdict'] = !l.redeemed ? 'soon' : net >= 0 ? 'keep' : 'reduce';
  return { avgGift, boostPct, extraCustomers, costToday, extraValue, net, verdict };
}

// ───────────────────────── Quảng cáo ─────────────────────────

export interface AdDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  price: number;
  days: number;
  traffic: number;
  /** Nghề được nhắm tới: khách thuộc nghề này hay ghé hơn (nhân trọng số). */
  targets?: string[];
  unlock: number;
}

export const ADS: AdDef[] = [
  { id: 'loa', icon: '📢', name: 'Loa phát thanh', desc: 'Xe loa chạy quanh hẻm hôm nay.', price: 60000, days: 1, traffic: 1.2, unlock: 3 },
  { id: 'to_roi', icon: '📄', name: 'Phát tờ rơi', desc: 'Nhét tờ rơi vào từng nhà, đông khách 3 ngày.', price: 150000, days: 3, traffic: 1.15, unlock: 4 },
  { id: 'bang_ron', icon: '🎌', name: 'Treo băng rôn', desc: 'Băng rôn trước tiệm cả tuần.', price: 400000, days: 7, traffic: 1.1, unlock: 8 },
  { id: 'cong_truong', icon: '👷', name: 'Tờ rơi công trường', desc: 'Dán ở công trường, công nhân và thợ ghé nhiều.', price: 120000, days: 3, traffic: 1.05, targets: ['construction', 'electrician', 'mechanic'], unlock: 6 },
  { id: 'truong_hoc', icon: '🎒', name: 'Tờ rơi cổng trường', desc: 'Học sinh, sinh viên, phụ huynh ghé nhiều.', price: 120000, days: 3, traffic: 1.05, targets: ['student_highschool', 'student_college', 'mom', 'teacher'], unlock: 6 },
  { id: 'benh_vien', icon: '🏥', name: 'Tờ rơi bệnh viện', desc: 'Y tá, bác sĩ ca đêm ghé mua đồ.', price: 120000, days: 3, traffic: 1.05, targets: ['nurse', 'doctor', 'retired_doctor'], unlock: 10 },
];

export interface ActiveAd { id: string; untilDay: number }

export const adById = (id: string) => ADS.find((a) => a.id === id);
export const activeAds = (ads: ActiveAd[], day: number) => ads.filter((a) => a.untilDay >= day);
export const adsTraffic = (ads: ActiveAd[], day: number) =>
  activeAds(ads, day).reduce((n, a) => n * (adById(a.id)?.traffic ?? 1), 1);
export const adTargets = (ads: ActiveAd[], day: number) =>
  activeAds(ads, day).flatMap((a) => adById(a.id)?.targets ?? []);

/**
 * GĐ128 — ROI quảng cáo: quy doanh thu chênh (ngày có ad vs ngày thường, từ `promoEffect`)
 * ra lời/lỗ ròng so với CHI PHÍ quảng cáo/ngày. THUẦN đọc state/hằng số có sẵn — không
 * đổi save/kinh tế. Trả null khi chưa đủ dữ liệu so sánh hoặc không có ad đang chạy.
 */
export interface AdRoi { withAvg: number; withoutAvg: number; adExtraRev: number; dailyCost: number; net: number; worth: 'yes' | 'no' }
export function adRoi(
  effect: { withAvg: number; withoutAvg: number } | null | undefined,
  ads: ActiveAd[],
  day: number,
): AdRoi | null {
  if (!effect) return null;
  const running = activeAds(ads, day);
  if (!running.length) return null;
  const dailyCost = running.reduce((n, a) => n + (adById(a.id)?.price ?? 0) / Math.max(1, adById(a.id)?.days ?? 1), 0);
  const adExtraRev = effect.withAvg - effect.withoutAvg;
  const net = adExtraRev - dailyCost;
  return { withAvg: effect.withAvg, withoutAvg: effect.withoutAvg, adExtraRev, dailyCost, net, worth: net > 0 ? 'yes' : 'no' };
}

// ───────────────────────── Vay vốn & hụi ─────────────────────────

export interface Loan {
  principal: number;
  takenDay: number;
  dueDay: number;
  /** Tổng lãi đã trả từ lúc vay (bản lưu cũ không có thì coi như 0). */
  interestPaid?: number;
}
export const LOAN_UNLOCK = 5;
/** Lãi mỗi ngày trên tiền gốc còn nợ. */
export const LOAN_DAILY_RATE = 0.008;
export const LOAN_DAYS = 30;
/** Gói vay nhỏ nhất (cũng là gói vay gấp khi chưa tới cấp mở vay). */
export const LOAN_OPTIONS_MIN = 1000000;
export const loanOptions = (level: number) => [1000000, 3000000, 10000000].filter((_, i) => level >= [5, 15, 30][i]);
/** Hạn mức nợ tối đa theo cấp: bằng gói vay lớn nhất đã mở. */
export const loanLimit = (level: number) => Math.max(0, ...loanOptions(level));
/** Lãi trừ mỗi tối, làm tròn trăm đồng như ngân hàng thu thật. */
export const loanInterest = (principal: number) => Math.round((principal * LOAN_DAILY_RATE) / 100) * 100;
/** Các khoản còn vay thêm được khi đang nợ: không vượt hạn mức. */
export const loanTopUps = (level: number, principal: number) =>
  [500000, 1000000, 3000000].filter((a) => principal + a <= loanLimit(level));
/** Khoản vay nhỏ nhất đủ bù `need` đồng; null nếu không còn vay được. Chưa tới cấp mở vay thì chỉ có gói vay gấp. */
export function loanToCover(level: number, principal: number | null, need: number): { amount: number; emergency: boolean } | null {
  if (principal != null) {
    const a = loanTopUps(level, principal).find((x) => x >= need);
    return a ? { amount: a, emergency: false } : null;
  }
  if (level < LOAN_UNLOCK) return need <= LOAN_OPTIONS_MIN ? { amount: LOAN_OPTIONS_MIN, emergency: true } : null;
  const a = loanOptions(level).find((x) => x >= need);
  return a ? { amount: a, emergency: false } : null;
}

export interface Hui {
  /** Tiền góp mỗi ngày và số "chân" (người chơi, mỗi người hốt một lần). */
  daily: number;
  members: number;
  startDay: number;
  /** Ngày mình được hốt hụi (trong vòng). */
  turnDay: number;
  received: boolean;
  /** Số ngày đã góp. */
  paidDays: number;
}
export const HUI_UNLOCK = 7;
export const HUI_OPTIONS = [{ daily: 30000, members: 10 }, { daily: 100000, members: 10 }];
/** Xác suất mỗi ngày chủ hụi ôm tiền bỏ trốn (vỡ hụi). */
export const HUI_COLLAPSE = 0.006;

// ───────────────────────── Báo cáo tuần ─────────────────────────

export interface WeekTally {
  startDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  items: Record<string, { qty: number; gross: number }>;
  /** Mục tiêu doanh thu tuần này (null = tuần đầu, chưa đặt). */
  goal: number | null;
  // ── Counter tuỳ chọn cho thử thách tuần (save cũ/tuần đang chạy thiếu thì coi như 0) ──
  /** Số món nhà làm bán được trong tuần. */
  cookedSold?: number;
  /** Số đơn nấu đã giao trong tuần. */
  cookOrders?: number;
  /** Số đơn app giao tới tay khách trong tuần. */
  onlineDone?: number;
  /** Số nông sản thu hoạch trong tuần. */
  farmHarvest?: number;
  /** Số bài đăng mạng xã hội trong tuần. */
  socialPosts?: number;
  /** Tiền lời dịch vụ ở quầy trong tuần. */
  services?: number;
  /** Số combo bán ra trong tuần. */
  combos?: number;
  /** Số lời khen 5★ nhận trong tuần. */
  fiveStars?: number;
}

export interface WeekReport {
  week: number;
  endDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  best?: string;
  worst?: string;
  goal: number | null;
  goalMet: boolean;
  reward: number;
  nextGoal: number;
  /** Kết quả thử thách tuần của tuần vừa chốt (thiếu ở bản lưu cũ). */
  challenge?: WeeklyChallengeResult;
  /** Chuỗi tuần hoàn thành thử thách tính SAU tuần này (để tuần mới hiển thị). */
  challengeStreak?: number;
  /** GĐ169 — XP thưởng chuỗi nhận ở lần chốt này (≥3 tuần đạt); 0/không có khi chưa đủ chuỗi. */
  streakXp?: number;
}

export const WEEK_DAYS = 7;
export const emptyWeek = (startDay: number, goal: number | null = null): WeekTally => ({
  startDay, revenue: 0, profit: 0, customers: 0, unhappy: 0, items: {}, goal,
});

// ───────────────────────── Thử thách tuần ─────────────────────────

export interface WeeklyChallenge {
  id: string;
  icon: string;
  title: string;
  unit: string;
  /** key đếm trong WeekTally, hoặc 'revenue' cho doanh thu tuần. */
  measure: 'cookedSold' | 'cookOrders' | 'onlineDone' | 'farmHarvest' | 'socialPosts' | 'services' | 'combos' | 'fiveStars' | 'revenue';
  /** Cấp tối thiểu mới vào vòng xoay thử thách này (bám mốc mở của từng hệ). */
  minLevel: number;
  /** Mục tiêu theo cấp (làm tròn đẹp). */
  target: (level: number) => number;
  /** Thưởng gốc theo cấp (làm tròn nghìn). */
  reward: (level: number) => number;
  /** Mô tả một câu, có mốc cụ thể theo cấp. */
  desc: (level: number) => string;
}

/** Kết quả thử thách tuần của một tuần đã chốt. */
export interface WeeklyChallengeResult {
  id: string;
  icon: string;
  title: string;
  unit: string;
  target: number;
  current: number;
  met: boolean;
  /** Tiền thưởng nhận được (đã nhân hệ số chuỗi); 0 nếu không đạt. */
  reward: number;
  desc: string;
}

const scale = (base: number, level: number, step: number) => Math.round(base * (1 + step * (level - 1)));
const round10k = (n: number) => Math.round(n / 10000) * 10000;
const round1k = (n: number) => Math.round(n / 1000) * 1000;

/** Gói dựng gọn: `descText` nhận đúng mục tiêu đã tính nên mô tả luôn khớp mốc thật. */
const weekly = (def: Omit<WeeklyChallenge, 'desc'>, descText: (target: number) => string): WeeklyChallenge => ({
  ...def, desc: (level) => descText(def.target(level)),
});

/** Thử thách tuần: mục tiêu ~4–6× nhiệm vụ ngày cùng hệ, thưởng ~2× (dịch vụ đo tiền lời nên
 *  mục tiêu = 5× nhiệm vụ ngày). Thứ tự trong bảng cũng là thứ tự xoay theo số tuần. */
export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  weekly({ id: 'wq_revenue', icon: '💰', title: 'Doanh thu tuần', unit: 'đ', measure: 'revenue', minLevel: 1,
    target: (lv) => round10k(900000 * (1 + 0.3 * (lv - 1))), reward: (lv) => round1k(150000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Doanh thu cả tuần đạt ${formatMoney(t)}`),
  weekly({ id: 'wq_five', icon: '⭐', title: 'Khách khen 5★', unit: 'lời', measure: 'fiveStars', minLevel: 5,
    target: (lv) => 5 + lv, reward: (lv) => round1k(120000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Nhận ${t} lời khen 5★ trong tuần`),
  weekly({ id: 'wq_service', icon: '🧾', title: 'Lời từ dịch vụ', unit: 'đ', measure: 'services', minLevel: 3,
    target: (lv) => round10k(scale(100000, lv, 0.15)), reward: (lv) => round1k(100000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Lời từ dịch vụ ở quầy cả tuần đạt ${formatMoney(t)}`),
  weekly({ id: 'wq_combo', icon: '🎁', title: 'Bán theo combo', unit: 'combo', measure: 'combos', minLevel: 6,
    target: (lv) => 8 + 2 * lv, reward: (lv) => round1k(130000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Bán ${t} combo trong tuần`),
  weekly({ id: 'wq_online', icon: '🛵', title: 'Giao đơn app', unit: 'đơn', measure: 'onlineDone', minLevel: 10,
    target: (lv) => 10 + lv, reward: (lv) => round1k(160000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Giao ${t} đơn app tới tay khách trong tuần`),
  weekly({ id: 'wq_farm', icon: '🌾', title: 'Thu hoạch trại', unit: 'sản phẩm', measure: 'farmHarvest', minLevel: 8,
    target: (lv) => 20 + 3 * lv, reward: (lv) => round1k(120000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Thu hoạch ${t} nông sản trong tuần`),
  weekly({ id: 'wq_social', icon: '📱', title: 'Lên mạng xã hội', unit: 'bài', measure: 'socialPosts', minLevel: 8,
    target: () => 4, reward: (lv) => round1k(90000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Đăng ${t} bài quảng bá trong tuần`),
  weekly({ id: 'wq_cooked', icon: '🍲', title: 'Bán món nhà làm', unit: 'món', measure: 'cookedSold', minLevel: 21,
    target: (lv) => 12 + 2 * lv, reward: (lv) => round1k(180000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Bán ${t} món nhà làm trong tuần`),
  weekly({ id: 'wq_cook_orders', icon: '🥡', title: 'Giao đơn nấu', unit: 'đơn', measure: 'cookOrders', minLevel: 21,
    target: (lv) => 4 + lv, reward: (lv) => round1k(170000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Giao ${t} đơn nấu trong tuần`),
];

/** Chọn thử thách tuần xác định theo số tuần và cấp: xoay vòng pool những thử thách đã mở, không random. */
export function weeklyChallenge(week: number, level: number): WeeklyChallenge {
  const pool = WEEKLY_CHALLENGES.filter((c) => c.minLevel <= level);
  return pool[week % pool.length] ?? WEEKLY_CHALLENGES[0];
}

// ── GĐ169: Trần ratchet mục tiêu doanh thu (audit tiến trình 29/10, phát hiện b) ──
// Công thức cũ `max(doanh thu, goal) × 1.1/1.15` nhân kép KHÔNG TRẦN: max() nuôi goal từ đỉnh cũ
// kể cả khi hụt → goal nhân 1.1/1.15 mỗi kỳ mãi mãi, trong khi năng lực doanh thu tiệm hữu hạn
// (tier có hạn, khách +4/cấp) → sau vài chục tuần goal hụt vĩnh viễn, thưởng 5%/6% + news "đạt
// mục tiêu" chết, nhịp tuần/tháng tự tắt ở cuối game.
// Trần CỨNG khi ĐẶT goal mới = doanh thu của kỳ vừa chốt (chính là trung bình 7/30 ngày gần nhất)
// × 1.15 — goal mới không bao giờ vượt quá năng lực gần nhất +15% (dư địa cho kỳ bán tốt).
// Quy tắc đặt goal: ĐẠT → min(công thức cũ, trần); HỤT → giữ goal cũ (đừng phạt kép) nhưng vẫn bó
// trần nếu goal cũ đã vượt năng lực (một tuần sau đỉnh spiked là goal trở lại tầm với).
// Goal ĐANG LƯU trong save cũ giữ nguyên tới lần chốt kế tiếp (không migration — clamp chỉ xảy
// ra lúc đặt mới, xem nextGoalCapped).
export const GOAL_CAP_FACTOR = 1.15;

/** GĐ169 — goal kỳ kế tiếp: ĐẠT → min(công thức cũ, trần năng lực); HỤT → giữ goal cũ nhưng vẫn
 *  bó trần; kỳ 0 doanh thu (tiệm nghỉ cả kỳ) → giữ goal cũ, không nhân tiếp. Tròn 10k như cũ. */
const nextGoalCapped = (revenue: number, oldGoal: number | null, met: boolean, ratchet: number): number => {
  const raw = Math.round((Math.max(revenue, oldGoal ?? 0) * ratchet) / 10000) * 10000;
  if (revenue <= 0) return oldGoal ?? raw;
  const cap = Math.round((revenue * GOAL_CAP_FACTOR) / 10000) * 10000;
  return Math.min(met ? raw : (oldGoal ?? raw), cap);
};

// ── GĐ169: Thưởng chuỗi thử thách tuần/tháng đổi sang XP (audit tiến trình 29/10, phát hiện c) ──
// Cũ: tiền thưởng thử thách nhân hệ số chuỗi ×1.2→×1.8 — trả TIỀN cho người thừa tiền (GĐ105: tiền
// hết là ràng buộc từ cấp 30) trong khi XP mới là thứ khan (4.8 ngày/cấp ở 31–44). Mới: tiền giữ hệ
// số nhỏ nhất (thưởng gốc ×1.0 — bỏ nhân chuỗi), cộng thẳng XP khi giữ được chuỗi ≥3 kỳ: mỗi tuần
// đạt chuỗi +35% xpToNext(level), tháng ×2. Đổi kinh tế NHẸ có chủ ý — Leader duyệt theo audit;
// KHÔNG đụng kinh tế bán hàng/thưởng nhiệm vụ. Sim GĐ169 (seed 169, 28 ngày, harness GĐ105): bot
// giữ chuỗi 0 + hụt goal mọi tuần → dòng tiền trực tiếp không đổi; XP/cấp không xuyên thừa (cấp 30
// 2.80 → 2.55–2.80 ngày/cấp, cấp 50 3.50 → 3.11); khi GIỮ chuỗi đều: +24% XP tuần ở nhịp audit
// 4.8 ngày/cấp, +14% ở nhịp bot 2.8 — bù đúng cỡ 10–15%+ (test weeklyGoalCap + simSmoke cấp 30/50).
export const STREAK_XP_FROM = 3;
export const STREAK_XP_RATE_WEEK = 0.35;
export const STREAK_XP_RATE_MONTH = 0.7;

export function closeWeek(t: WeekTally, endDay: number, level: number, streak: number): WeekReport {
  const lines = Object.entries(t.items);
  const best = [...lines].sort((a, b) => b[1].gross - a[1].gross)[0]?.[0];
  const worst = lines.filter(([, l]) => l.qty > 0).sort((a, b) => a[1].gross / a[1].qty - b[1].gross / b[1].qty)[0]?.[0];
  const goalMet = t.goal !== null && t.revenue >= t.goal;
  const week = Math.ceil(endDay / WEEK_DAYS);
  const ch = weeklyChallenge(week, level);
  const chTarget = ch.target(level);
  const chCurrent = ch.measure === 'revenue' ? t.revenue : (t[ch.measure] ?? 0);
  const chMet = chCurrent >= chTarget;
  // GĐ169 — tiền thưởng thử thách giữ hệ số nhỏ nhất (thưởng gốc, bỏ nhân chuỗi ×1.2→×1.8 cũ);
  // chuỗi được đền bằng XP (streakXp dưới đây) thay vì tiền.
  const chReward = chMet ? Math.round(ch.reward(level) / 1000) * 1000 : 0;
  // GĐ169 — XP chuỗi: từ tuần đạt thứ 3 liên tiếp trở đi, mỗi tuần giữ chuỗi +35% xpToNext.
  const streakXp = chMet && streak + 1 >= STREAK_XP_FROM ? Math.round(STREAK_XP_RATE_WEEK * xpToNext(level)) : 0;
  return {
    week, endDay, revenue: t.revenue, profit: t.profit, customers: t.customers, unhappy: t.unhappy,
    best, worst: worst !== best ? worst : undefined, goal: t.goal, goalMet,
    reward: goalMet ? Math.round((t.goal! * 0.05) / 1000) * 1000 : 0,
    nextGoal: nextGoalCapped(t.revenue, t.goal, goalMet, 1.1),
    streakXp,
    challenge: {
      id: ch.id, icon: ch.icon, title: ch.title, unit: ch.unit,
      target: chTarget, current: chCurrent, met: chMet, reward: chReward, desc: ch.desc(level),
    },
    challengeStreak: chMet ? streak + 1 : 0,
  };
}

// GĐ121 — Nhịp chạy tuần: tín hiệu thuần đọc cho thử thách tuần (có theo kịp không? có nguy cơ
// mất chuỗi không?), đúng mô-típ GĐ119/120 (đọc dữ liệu sẵn có → UI signal). KHÔNG đổi state/
// save/kinh tế — chỉ quy đổi tally hiện tại + streak có sẵn. Trả null khi mục tiêu vô nghĩa.
export interface WeekPace {
  /** Nhịp hiện tại = current/target (0..). */
  pace: number;
  /** Số ngày còn lại trong tuần (1..7). */
  remainingDays: number;
  /** Dự kiến cuối tuần nếu giữ nguyên nhịp = current + pace × remainingDays. */
  projected: number;
  /** Có kịp mục tiêu cuối tuần theo dự kiến không. */
  onTrack: boolean;
  /** Đang hụt MÀ đang có chuỗi → nguy cơ mất chuỗi/thưởng cộng dồn. */
  streakAtRisk: boolean;
  /** GĐ169 — XP chuỗi tuần này sẽ nhận nếu giữ chuỗi ≥3 (trượt tuần này là mất); 0 khi chưa đủ chuỗi. */
  streakXp: number;
  /** Còn thiếu bao nhiêu so với mục tiêu (>=0). */
  missing: number;
}
export function weekPace(
  current: number, target: number, remainingDays: number, streak: number, level: number,
): WeekPace | null {
  if (target <= 0 || remainingDays <= 0) return null;
  const elapsed = WEEK_DAYS - remainingDays;
  // Dự đoán cuối tuần theo NHỊP HIỆN TẠI (giữ nguyên tốc độ mỗi ngày): current / số ngày đã trôi × 7.
  // Ngày đầu (elapsed=0) chưa có nhịp → projected = hiện tại (chưa khẳng định hụt/kịp).
  const projected = elapsed > 0 ? (current * WEEK_DAYS) / elapsed : current;
  const onTrack = projected >= target;
  const missing = Math.max(0, target - current);
  return {
    pace: target > 0 ? current / target : 0, remainingDays, projected, onTrack,
    streakAtRisk: !onTrack && streak >= 1 && current < target,
    streakXp: streak + 1 >= STREAK_XP_FROM ? Math.round(STREAK_XP_RATE_WEEK * xpToNext(level)) : 0,
    missing,
  };
}

// ───────────────────────── Tháng vận hành ─────────────────────────
// Lớp nhịp "tháng" (dương lịch 1–12) nối tiếp nhịp tuần: cho người chơi một mốc "quay lại trước
// hết tháng" và giữ lý do trụ lâu. Giống tuần nhưng mục tiêu/thưởng to hơn, neo theo tháng thật mà
// lịch trong game đã hiển thị (CalendarPanel), nên mốc luôn khớp với thứ người chơi nhìn thấy.

/** Sổ tích lũy của một tháng vận hành. */
export interface MonthTally {
  /** Ngày bắt đầu theo dõi tháng này (ngày đầu tháng hoặc ngày load save cũ). */
  startDay: number;
  /** Tháng dương lịch (1–12) tally này đang đếm. */
  month: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  items: Record<string, { qty: number; gross: number }>;
  /** Mục tiêu doanh thu tháng này (null = tháng đầu tiên, chưa đặt). */
  goal: number | null;
  // ── Counter tuỳ chọn cho thử thách tháng (save cũ thiếu thì coi như 0) ──
  cookedSold?: number;
  cookOrders?: number;
  onlineDone?: number;
  farmHarvest?: number;
  services?: number;
  combos?: number;
  fiveStars?: number;
  socialPosts?: number;
}

export interface MonthReport {
  month: number;
  startDay: number;
  endDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  best?: string;
  worst?: string;
  goal: number | null;
  goalMet: boolean;
  reward: number;
  nextGoal: number;
  /** Kết quả thử thách tháng vừa chốt. */
  challenge?: WeeklyChallengeResult;
  /** Chuỗi tháng hoàn thành thử thách tính SAU tháng này. */
  monthStreak?: number;
  /** GĐ169 — XP thưởng chuỗi tháng nhận ở lần chốt này (≥3 tháng đạt, ×2 tuần); 0 khi chưa đủ. */
  streakXp?: number;
}

export const emptyMonth = (startDay: number, month: number, goal: number | null = null): MonthTally => ({
  startDay, month, revenue: 0, profit: 0, customers: 0, unhappy: 0, items: {}, goal,
});

/** Thử thách tháng: cùng cơ chế đo và xoay như tuần nhưng mục tiêu/thưởng to hơn hẳn. */
export const MONTHLY_CHALLENGES: WeeklyChallenge[] = [
  weekly({ id: 'mq_revenue', icon: '📈', title: 'Doanh thu tháng', unit: 'đ', measure: 'revenue', minLevel: 1,
    target: (lv) => round10k(5000000 * (1 + 0.3 * (lv - 1))), reward: (lv) => round1k(800000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Doanh thu cả tháng đạt ${formatMoney(t)}`),
  weekly({ id: 'mq_five', icon: '🌟', title: 'Một tháng khen ngợi', unit: 'lời', measure: 'fiveStars', minLevel: 5,
    target: (lv) => 20 + 4 * lv, reward: (lv) => round1k(700000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Nhận ${t} lời khen 5★ trong tháng`),
  weekly({ id: 'mq_online', icon: '🛵', title: 'Đơn app dày đặc', unit: 'đơn', measure: 'onlineDone', minLevel: 10,
    target: (lv) => 60 + 5 * lv, reward: (lv) => round1k(900000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Giao ${t} đơn app tới tay khách trong tháng`),
  weekly({ id: 'mq_farm', icon: '🌾', title: 'Mảnh vườn bội thu', unit: 'sản phẩm', measure: 'farmHarvest', minLevel: 8,
    target: (lv) => 150 + 15 * lv, reward: (lv) => round1k(700000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Thu hoạch ${t} nông sản trong tháng`),
  weekly({ id: 'mq_cooked', icon: '🍲', title: 'Bếp chạy cả tháng', unit: 'món', measure: 'cookedSold', minLevel: 21,
    target: (lv) => 90 + 8 * lv, reward: (lv) => round1k(1100000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Bán ${t} món nhà làm trong tháng`),
  weekly({ id: 'mq_services', icon: '🧾', title: 'Dịch vụ đều tay', unit: 'đ', measure: 'services', minLevel: 3,
    target: (lv) => round10k(scale(700000, lv, 0.15)), reward: (lv) => round1k(600000 * (1 + 0.25 * (lv - 1))) },
    (t) => `Lời từ dịch vụ ở quầy cả tháng đạt ${formatMoney(t)}`),
];

/** Chọn thử thách tháng xác định theo tháng và cấp: xoay vòng pool những thử thách đã mở, không random. */
export function monthlyChallenge(month: number, level: number): WeeklyChallenge {
  const pool = MONTHLY_CHALLENGES.filter((c) => c.minLevel <= level);
  return pool[month % pool.length] ?? MONTHLY_CHALLENGES[0];
}

export function closeMonth(t: MonthTally, endDay: number, level: number, streak: number): MonthReport {
  const lines = Object.entries(t.items);
  const best = [...lines].sort((a, b) => b[1].gross - a[1].gross)[0]?.[0];
  const worst = lines.filter(([, l]) => l.qty > 0).sort((a, b) => a[1].gross / a[1].qty - b[1].gross / b[1].qty)[0]?.[0];
  const goalMet = t.goal !== null && t.revenue >= t.goal;
  const ch = monthlyChallenge(t.month, level);
  const chTarget = ch.target(level);
  const chCurrent = ch.measure === 'revenue' ? t.revenue : (t[ch.measure] ?? 0);
  const chMet = chCurrent >= chTarget;
  // GĐ169 — tiền thưởng thử thách tháng giữ hệ số nhỏ nhất (thưởng gốc, bỏ nhân chuỗi ×1.2→×1.8 cũ);
  // chuỗi tháng được đền bằng XP (streakXp) thay vì tiền, hệ số gấp đôi tuần.
  const chReward = chMet ? Math.round(ch.reward(level) / 1000) * 1000 : 0;
  const streakXp = chMet && streak + 1 >= STREAK_XP_FROM ? Math.round(STREAK_XP_RATE_MONTH * xpToNext(level)) : 0;
  return {
    month: t.month, startDay: t.startDay, endDay, revenue: t.revenue, profit: t.profit, customers: t.customers, unhappy: t.unhappy,
    best, worst: worst !== best ? worst : undefined, goal: t.goal, goalMet,
    reward: goalMet ? Math.round((t.goal! * 0.06) / 1000) * 1000 : 0,
    nextGoal: nextGoalCapped(t.revenue, t.goal, goalMet, 1.15),
    streakXp,
    challenge: {
      id: ch.id, icon: ch.icon, title: ch.title, unit: ch.unit,
      target: chTarget, current: chCurrent, met: chMet, reward: chReward, desc: ch.desc(level),
    },
    monthStreak: chMet ? streak + 1 : 0,
  };
}

// ───────────────────────── Thú cưng ─────────────────────────

export type PetKind = 'cat' | 'dog';
export interface PetDef { kind: PetKind; icon: string; name: string; price: number; unlock: number; food: string; desc: string }
export const PETS: PetDef[] = [
  { kind: 'cat', icon: '🐱', name: 'Mèo Mướp', price: 300000, unlock: 5, food: 'x_thuc_an_meo', desc: 'Nằm quầy bắt chuột: hàng hỏng chậm hơn 20%. Trẻ con thích ghé vuốt mèo.' },
  { kind: 'dog', icon: '🐶', name: 'Chó Vàng', price: 500000, unlock: 12, food: 'x_thuc_an_cho', desc: 'Giữ cửa: kẻ trộm ít dám vào hơn một nửa, dễ bị bắt hơn.' },
];
export interface PetState { fedDay: number }
export const petDef = (k: PetKind) => PETS.find((p) => p.kind === k)!;
/** Thú được cho ăn hôm qua hoặc hôm nay thì mới có tác dụng. */
export const petActive = (p: PetState | undefined, day: number) => !!p && day - p.fedDay <= 1;

// ───────────────────────── Thành tựu ─────────────────────────

export interface AchievementCtx {
  totals: { revenue: number; itemsSold: number; customers: number };
  level: number;
  ordersDone: number;
  phoneOrdersDone: number;
  closeFriends: number;
  rivalsBeaten: number;
  petCount: number;
  homeDecor: number;
  vehicle: Vehicle;
  perfectDays: number;
  /** Số món nhà làm đã bán. */
  cookedSold: number;
  /** Số trạm nấu khác nhau đã lắp. */
  cookedStations: number;
  /** Sao chất lượng món (từ sổ danh tiếng). */
  qualityStars: number;
  /** Số món chớp nhoáng bán ở kệ cạnh quầy. */
  impulseSold: number;
  /** Số đơn nấu (đặt riêng món nhà làm) đã giao. */
  cookOrdersDone: number;
  /** Số đối thủ bị hạ bởi đợt phản công chủ động. */
  counterKills: number;
}
export interface Achievement { id: string; icon: string; name: string; desc: string; reward: number; done: (c: AchievementCtx) => boolean }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_100', icon: '🛒', name: 'Mối đầu tiên', desc: 'Bán 100 món', reward: 20000, done: (c) => c.totals.itemsSold >= 100 },
  { id: 'items_1000', icon: '📦', name: 'Nghìn món', desc: 'Bán 1.000 món', reward: 100000, done: (c) => c.totals.itemsSold >= 1000 },
  { id: 'items_10000', icon: '🏭', name: 'Vạn món', desc: 'Bán 10.000 món', reward: 600000, done: (c) => c.totals.itemsSold >= 10000 },
  { id: 'rev_10m', icon: '💰', name: 'Chục triệu', desc: 'Tổng doanh thu 10 triệu', reward: 200000, done: (c) => c.totals.revenue >= 10000000 },
  { id: 'rev_100m', icon: '🏦', name: 'Trăm triệu', desc: 'Tổng doanh thu 100 triệu', reward: 1500000, done: (c) => c.totals.revenue >= 100000000 },
  { id: 'cust_1000', icon: '👥', name: 'Cả xóm đều biết', desc: 'Đón 1.000 lượt khách', reward: 150000, done: (c) => c.totals.customers >= 1000 },
  { id: 'friends_5', icon: '💛', name: 'Bạn của cả hẻm', desc: '5 khách quen thân từ 40 💛', reward: 200000, done: (c) => c.closeFriends >= 5 },
  { id: 'orders_10', icon: '🎉', name: 'Lo tiệc giỏi', desc: 'Giao 10 đơn tiệc', reward: 150000, done: (c) => c.ordersDone >= 10 },
  { id: 'phone_20', icon: '📞', name: 'Alo là có', desc: 'Giao 20 đơn gọi điện', reward: 150000, done: (c) => c.phoneOrdersDone >= 20 },
  { id: 'rival', icon: '⚔️', name: 'Đứng vững đầu hẻm', desc: 'Khiến một tiệm đối thủ đóng cửa', reward: 300000, done: (c) => c.rivalsBeaten >= 1 },
  { id: 'perfect', icon: '🌟', name: 'Ngày hoàn hảo', desc: 'Một ngày từ 20 khách, không ai không hài lòng', reward: 100000, done: (c) => c.perfectDays >= 1 },
  { id: 'pets', icon: '🐾', name: 'Tiệm có bé cưng', desc: 'Nuôi cả mèo và chó', reward: 100000, done: (c) => c.petCount >= 2 },
  { id: 'home', icon: '🏡', name: 'Tổ ấm', desc: 'Sắm đủ 4 món cho nhà riêng', reward: 100000, done: (c) => c.homeDecor >= 4 },
  { id: 'moto', icon: '🏍️', name: 'Có xe máy', desc: 'Mua xe máy', reward: 50000, done: (c) => c.vehicle === 'moto' },
  { id: 'cooked_500', icon: '🍲', name: 'Bếp kho đã động', desc: 'Bán 500 món nhà làm', reward: 200000, done: (c) => c.cookedSold >= 500 },
  { id: 'stations_8', icon: '🏭', name: 'Nhà hàng thu nhỏ', desc: 'Lắp đủ 8 trạm nấu', reward: 400000, done: (c) => c.cookedStations >= 8 },
  { id: 'quality_4', icon: '⭐', name: 'Ngon có tiếng', desc: 'Chất lượng món đạt 4★ danh tiếng', reward: 300000, done: (c) => c.qualityStars >= 4 },
  { id: 'impulse_100', icon: '🍬', name: 'Kệ sinh lời cạnh quầy', desc: 'Bán 100 món chớp nhoáng ở kệ bên quầy thu ngân', reward: 100000, done: (c) => c.impulseSold >= 100 },
  { id: 'cook_orders_10', icon: '🍳', name: 'Bếp nhận đơn riêng', desc: 'Giao 10 đơn nấu món nhà làm (giá hời)', reward: 150000, done: (c) => c.cookOrdersDone >= 10 },
  { id: 'counter_kill', icon: '🎯', name: 'Đòn kết liễu', desc: 'Khiến đối thủ đóng cửa bằng đợt phản công chủ động', reward: 300000, done: (c) => c.counterKills >= 1 },
  { id: 'level_20', icon: '⭐', name: 'Chủ tiệm lành nghề', desc: 'Đạt cấp 20', reward: 200000, done: (c) => c.level >= 20 },
  { id: 'level_50', icon: '👑', name: 'Ông trùm siêu thị', desc: 'Đạt cấp 50', reward: 2000000, done: (c) => c.level >= 50 },
  // ── Mốc xa — cho người chơi dài hơi mục tiêu để trụ lại ──
  { id: 'level_80', icon: '🌟', name: 'Bậc thầy ngành tạp hóa', desc: 'Đạt cấp 80', reward: 3000000, done: (c) => c.level >= 80 },
  { id: 'level_90', icon: '👑', name: 'Huyền thoại phố hẻm', desc: 'Đạt cấp 90', reward: 5000000, done: (c) => c.level >= 90 },
  { id: 'level_100', icon: '🏆', name: 'Bá chủ ngõ phố', desc: 'Đạt cấp 100 (sẵn sàng tái sinh)', reward: 20000000, done: (c) => c.level >= 100 },
  { id: 'rev_500m', icon: '🏬', name: 'Nửa tỷ đồng', desc: 'Tổng doanh thu 500 triệu', reward: 3000000, done: (c) => c.totals.revenue >= 500000000 },
  { id: 'items_100k', icon: '🏭', name: 'Trăm nghìn món', desc: 'Bán 100.000 món', reward: 2000000, done: (c) => c.totals.itemsSold >= 100000 },
  { id: 'cust_5000', icon: '🎪', name: 'Cả phường quen mặt', desc: 'Đón 5.000 lượt khách', reward: 800000, done: (c) => c.totals.customers >= 5000 },
  { id: 'friends_10', icon: '💞', name: 'Hẻm tui thân nhau', desc: '10 khách quen thân từ 40 💛', reward: 400000, done: (c) => c.closeFriends >= 10 },
  { id: 'perfect_10', icon: '🌈', name: 'Trọn một tháng không phật lòng', desc: 'Đạt 10 ngày hoàn hảo', reward: 1000000, done: (c) => c.perfectDays >= 10 },
  { id: 'cooked_2000', icon: '🍱', name: 'Bếp chạy đều mỗi ngày', desc: 'Bán 2.000 món nhà làm', reward: 600000, done: (c) => c.cookedSold >= 2000 },
  { id: 'impulse_500', icon: '🍭', name: 'Kệ cạnh quầy đắc ý', desc: 'Bán 500 món chớp nhoáng ở kệ bên quầy thu ngân', reward: 300000, done: (c) => c.impulseSold >= 500 },
];

// ───────────────────────── Thanh tra thị trường ─────────────────────────

/** Thanh tra thị trường ghé từ cấp này. */
export const INSPECTION_UNLOCK = 12;
/** Cứ chừng này ngày có một lượt thanh tra (sau khi đóng cửa). */
export const INSPECTION_EVERY = 14;
export const INSPECTION_REWARD = 250000;
export const INSPECTION_FINE = 120000;
/** Số món cận hạn (≤1 ngày) tối đa được coi là "quản lý hàng hoá tốt". */
export const INSPECTION_NEAR_MAX = 5;

/** Số liệu thanh tra xem xét (đều lấy từ chỉ số sẵn có của ngày). */
export interface InspectionCtx {
  /** Độ bẩn sàn 0–100. */
  dirt: number;
  /** Số món cận hạn còn bày trên kệ. */
  nearExpiryOnShelves: number;
  /** Giá bán trung bình so với giá gợi ý. */
  priceIndex: number;
  /** Sao trung bình của các đánh giá gần nhất. */
  rating: number;
  /** Tủ mát/tủ đông hỏng mà vẫn còn hàng (đứt chuỗi lạnh: tính vào tiêu chí quản lý hàng hoá). */
  coldBroken?: number;
}

export interface InspectionResult {
  pass: boolean;
  /** Số tiêu chí đạt (0–4). */
  score: number;
  /** Nhận xét từng tiêu chí (tiêu đề để ghép thông báo). */
  notes: string[];
}

/** Chấm điểm thanh tra: sạch – quản lý hàng hoá – giá hợp lý – phục vụ tốt; đạt 3/4 thì qua. */
export function inspectionResult(ctx: InspectionCtx): InspectionResult {
  const checks = [
    { ok: ctx.dirt <= 30, ok_: 'Sàn sạch sẽ', bad: 'Sàn bẩn, lau nhà đi' },
    ctx.coldBroken
      ? { ok: false, ok_: '', bad: `${ctx.coldBroken} tủ lạnh hỏng vẫn bày hàng mát (đứt chuỗi lạnh)` }
      : { ok: ctx.nearExpiryOnShelves <= INSPECTION_NEAR_MAX, ok_: 'Quản lý hàng cận hạn tốt', bad: `${ctx.nearExpiryOnShelves} món cận hạn còn bày la liệt trên kệ` },
    { ok: ctx.priceIndex <= 1.2, ok_: 'Giá niêm yết hợp lý', bad: 'Giá bán chung cao hơn giá gợi ý quá 20%' },
    { ok: ctx.rating >= 4, ok_: 'Khách đánh giá tốt', bad: `Đánh giá trung bình mới ${ctx.rating.toFixed(1)}★` },
  ];
  const score = checks.filter((c) => c.ok).length;
  return { pass: score >= 3, score, notes: checks.map((c) => (c.ok ? `✅ ${c.ok_}` : `❌ ${c.bad}`)) };
}

// ───────────────────────── Sự kiện bất ngờ ─────────────────────────

export interface EventChoice {
  label: string;
  result: string;
  money?: number;
  xp?: number;
  minutes?: number;
  rating?: number;
  friendship?: { id: string; delta: number };
  /** GĐ164: lựa chọn "ấm" — được đếm vào thưởng cuối của arc (arcGoodCount). */
  good?: boolean;
  /** GĐ164: cần hàng trong KHO đủ số lượng mới chọn được — UI xám + core chặn khi thiếu. */
  needStock?: { productId: string; qty: number };
}
export interface SurpriseDef { id: string; icon: string; title: string; text: string; unlock: number; choices: EventChoice[] }

/**
 * Sự kiện bất ngờ một-phát (pool của `maybeSurprise`). GĐ164: 4 def cũ (mua_roi,
 * bong_da_kinh, mua_dai, livestream) chuyển thành arc 2–3 ngày ở `data/surpriseArcs.ts`
 * — pool trúng id-có-arc thì core mở arc thay vì phát def một-phát.
 * GĐ165: bổ sung 5 def một-phát cấp thấp (unlock 1–5) — pool ngày 1–5 dày lại sau khi arc A–D thay 4 def.
 */
/** Sự kiện bất ngờ: nội dung ở stories.ts (nạp lười); rỗng tới khi loadStories() xong. */
export let SURPRISES: SurpriseDef[] = [];

export const SURPRISE_CHANCE = 0.45;
export interface ActiveSurprise { id: string; expiresAt: number }

// ───────────────────────── Chuyện khách quen theo chương ─────────────────────────

export interface StoryChapter { at: number; title: string; text: string; reward?: { money?: number; xp?: number } }

/** Mỗi khách quen 3 chương (nội dung ở stories.ts, nạp lười để gói tải ban đầu nhẹ hơn). Rỗng tới khi loadStories() xong — mọi chỗ đọc đã chịu được `undefined`. */
export let STORIES: Record<string, StoryChapter[]> = {};
export const loadStories = () => import('./stories').then((m) => { STORIES = m.STORIES; SURPRISES = m.SURPRISES; });

// ───────────────────────── Nhà riêng, bữa sáng, xe cộ ─────────────────────────

export interface HomeItem { id: string; icon: string; name: string; price: number; unlock: number; rest: number }
/** Mỗi món làm giấc ngủ ngon hơn: sáng hôm sau đi nhanh hơn `rest` (cộng dồn). */
export const HOME_ITEMS: HomeItem[] = [
  { id: 'den_ngu', icon: '💡', name: 'Đèn ngủ', price: 80000, unlock: 2, rest: 0.03 },
  { id: 'quat', icon: '🌀', name: 'Quạt đứng', price: 150000, unlock: 3, rest: 0.04 },
  { id: 'tu_quan_ao', icon: '🚪', name: 'Tủ quần áo', price: 300000, unlock: 5, rest: 0.03 },
  { id: 'tivi', icon: '📺', name: 'Ti vi', price: 600000, unlock: 8, rest: 0.04 },
  { id: 'may_lanh', icon: '❄️', name: 'Máy lạnh', price: 1500000, unlock: 15, rest: 0.06 },
];
export const homeRest = (owned: string[]) => owned.reduce((n, id) => n + (HOME_ITEMS.find((h) => h.id === id)?.rest ?? 0), 0);

export const BREAKFAST = { price: 20000, speed: 0.1, lateMinutes: 60 };
/** Phút trong ngày (tính từ 0h hôm nay) mà quá đó chưa ngủ thì ngất: 02:00 hôm sau, +1h nếu đã ăn sáng. */
export const faintMinutes = (fedBreakfast: boolean): number => 26 * 60 + (fedBreakfast ? BREAKFAST.lateMinutes : 0);

export type Vehicle = 'none' | 'bike' | 'moto';
export const VEHICLES: { id: Exclude<Vehicle, 'none'>; icon: string; name: string; price: number; unlock: number; speed: number; travel: number }[] = [
  { id: 'bike', icon: '🚲', name: 'Xe đạp', price: 400000, unlock: 3, speed: 0.25, travel: 0.7 },
  { id: 'moto', icon: '🏍️', name: 'Xe máy', price: 4000000, unlock: 12, speed: 0.6, travel: 0.4 },
];
export const vehicleDef = (v: Vehicle) => VEHICLES.find((x) => x.id === v);

// ───────────────────────── Trạng thái gộp ─────────────────────────

export interface BizState {
  rival: Rival | null;
  rivalsBeaten: number;
  /** Ngày sớm nhất có thể mở đối thủ mới. */
  rivalNextDay: number;
  /** Đợt phản công đối thủ đang chạy (hiệu lực trong ngày); null = không có. */
  counter: Counter | null;
  /** Ngày gần nhất có đợt phản công; đối đầu nhiều ngày liền thì đòn nặng dần. */
  counterLastDay?: number;
  /** Chuỗi ngày liên tiếp có đợt phản công (1 = ngày đầu tiên). */
  counterStreak?: number;
  /** Ngày sớm nhất được dùng lại từng chiến thuật phản công (thời gian hồi). */
  counterReady: Partial<Record<CounterTactic, number>>;
  ads: ActiveAd[];
  loyalty: Loyalty;
  loan: Loan | null;
  hui: Hui | null;
  week: WeekTally;
  lastWeek: WeekReport | null;
  /** Số tuần liên tiếp hoàn thành thử thách tuần (trật một tuần thì về 0). */
  weekStreak: number;
  /** Sổ tích lũy tháng vận hành + báo cáo tháng trước + chuỗi tháng hoàn thành thử thách. */
  month: MonthTally;
  lastMonth: MonthReport | null;
  monthStreak: number;
  /** Sổ tích lũy năm vận hành + báo cáo năm trước (GĐ82 — nhịp năm, nối 4 mùa). */
  year: import('./yearReport').YearTally;
  lastYear: import('./yearReport').YearReport | null;
  /** Sổ Mùa (GĐ83): sao mọi mùa tích lũy qua TẤT CẢ năm + những mốc tổng sao đã nhận thưởng. */
  seasonAlmanac?: Partial<Record<'spring' | 'summer' | 'autumn' | 'winter', number>>;
  almanacClaimed?: number[];
  pets: Partial<Record<PetKind, PetState>>;
  achievements: string[];
  perfectDays: number;
  surprise: ActiveSurprise | null;
  surpriseDay: number;
  /** Chương truyện đã xem của từng khách quen. */
  story: Record<string, number>;
  /** Chương đang chờ hiện (khách quen vừa ghé). */
  storyPending: { regular: string; chapter: number } | null;
  home: string[];
  vehicle: Vehicle;
  breakfastDay: number;
  /** Chương cốt truyện đã xem, và chương đang chờ hiện hội thoại. */
  chapters: string[];
  chapterPending: string | null;
  /** Số đối thủ bị đánh bại nhờ đợt phản công chủ động (đếm cho thành tựu). */
  counterKills: number;
  /** Rival vừa đóng cửa, chào bán mặt bằng: mua lại thành chi nhánh; hết hạn thì người khác thuê mất. */
  rivalForSale?: { name: string; price: number; until: number };
  /** Tính cách của rival vừa đóng cửa gần nhất: thế hệ rival mới rút tính cách tránh lặp lượt trước. */
  lastRivalPers?: RivalPersonality;
  /** Đã mua lại tiệm đối thủ: khách cũ của họ ghé thêm trong tới ngày này. */
  rivalBuyUntil?: number;
  /** Nhật ký sức mạnh rival từng đêm (cửa sổ lăn − RIVAL_TREND_DAYS); clear khi rival đóng cửa.
   *  Bản lưu cũ thiếu → tự bù [] qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  rivalTrend: RivalTrendDay[];
  /** Ngày gần nhất đã hiện một chương hội thoại (tối đa 1 chương/ngày, tránh dồn khi lên cấp nhanh). */
  chapterDay?: number;
  /** Đã tắt hướng dẫn ngày đầu. */
  tutorialOff: boolean;
  /** Tái sinh (NG+): số lần đã tái sinh (0 = lần chơi đầu) và hệ số doanh thu đang hưởng (0 → không đổi).
   *  `goalsClaimed` (GĐ140): mục tiêu vòng tái sinh đã nhận thưởng trong vòng hiện tại — reset mỗi vòng. */
  prestige: { level: number; bonus: number; goalsClaimed?: string[] };
  /** Dịch vụ ở quầy đã mở (nạp tiền, thu hộ); thiếu ở save cũ. */
  services?: string[];
  /** Thiết bị đã mua (camera, máy POS); thiếu ở save cũ. */
  upgrades?: string[];
  /** Quán nước đầu ngõ (GĐ7, bán đồ uống rút từ kho); thiếu ở save cũ — nạp bản cũ tự bù mặc định. */
  quanNuoc: QuanNuocState;
  /** Kết quả ngày vừa rồi của quán nước (để UI hiển thị); chưa từng chạy thì undefined.
   *  wages = tổng lương nhân viên phải trả hôm đó, profit = revenue − wages (lời ròng thật). */
  quanNuocLast?: { day: number; revenue: number; served: number; wanted: number; wages: number; profit: number };
  /** Các mốc 'Sổ tay Tiệm' đã nhận thưởng (GĐ36): danh sách ngưỡng món đã bán. Bản lưu cũ thiếu thì coi như []. */
  discoveryClaimed?: number[];
  /** Công trình khu phố (GĐ40) — sân chơi trẻ em: mỗi ngày góp một lần cho tới khi khánh thành.
   *  Bản lưu cũ thiếu thì `applySnapshot` bù mặc định {0, 0} qua MERGE_DEEP. */
  landmark: { contributions: number; lastContributeDay: number };
  /** Nhân khẩu học khách vãng lai (GĐ62): mỗi nghề một dòng tích lũy trong ván.
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  demographics: Record<string, { visits: number; revenue: number; walkouts: number }>;
  /** Các mồi "Thử ngay" mở khóa hệ mới đã xem (GĐ64): danh sách id đã hiện một lần.
   *  Bản lưu cũ thiếu → tự bù [] qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  unlockActs: string[];
  /** Tiền lời dịch vụ ở quầy tích lũy cả ván theo từng dịch vụ (GĐ66 — đo "đã hoàn vốn chưa").
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  serviceLife: Record<string, number>;
  /** Hồ sơ mối quen lâu dài (GĐ67): doanh mua + số đơn tích lũy cả ván theo từng nhà cung cấp.
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  supplierRel: Record<string, { spent: number; orders: number }>;
  /** Doanh mua tháng theo từng mối (GĐ67): so với cam kết để hoàn cuối tháng, rồi reset.
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  supplierRelMonth: Record<string, number>;
  /** Số hiệu phiên chợ (tháng) đã lấy lô chợ phiên đặc biệt (GĐ68).
   *  Bản lưu cũ thiếu → undefined (chưa lấy tháng nào, không cần SAVE_VERSION). */
  fairTaken?: number;
  /** Lượt khách quen đã phục vụ trong tháng này (GĐ69, Sổ thương mến): cuối tháng
   *  quy thành quà tri ân. Bản lưu cũ thiếu → 0 qua default/MERGE_DEEP. */
  triAnMonth: number;
  /** Tháng đã trả quà tri ân cuối tháng (GĐ69): tránh trả 2 lần cho cùng một tháng.
   *  Bản lưu cũ thiếu → undefined (chưa trả tháng nào, không cần SAVE_VERSION). */
  triAnPaidMonth?: number;
  /** Ngày game đã nhận thưởng đón lễ (GĐ70): 1 dịp lễ 1 lần. Bản lưu cũ thiếu →
   *  undefined (chưa nhận dịp nào, không cần SAVE_VERSION). */
  prepClaimed?: number;
  /** Đối tác Hiệp lực chi nhánh×quán nước (GĐ74): state cam kết tháng (m, active, cọc). Bản lưu cũ
   *  thiếu → mặc định không đối tác (NO SAVE_VERSION, save cũ tự bù qua MERGE_DEEP). */
  hiepLuc?: HiepLucState;
  /** Doanh thu chung 2 cơ sở tích lũy trong tháng đối tác (GĐ74). */
  hiepLucMonth?: number;
  /** Số tháng liên tiếp đạt hiệp lực (GĐ74): thưởng chuỗi. */
  hiepLucStreak?: number;
  /** Sự kiện thử thách theo mùa (GĐ75): state đang theo dõi — `season` + sao đã gom + ngày mùa
   *  đã nhận thưởng (dayIndex của mùa). Bản lưu cũ thiếu → mặc định trống (NO SAVE_VERSION). */
  seasonEvt?: SeasonEventState;
  /** Nếp vận hành (GĐ79): chuỗi ngày "sạch" liên tiếp (đủ đông khách, không ai bỏ vì chờ/hết hàng). */
  cleanStreak?: number;
  /** Kỷ lục chuỗi sạch từng đạt. */
  cleanBest?: number;
  /** Mốc chuỗi cao nhất đã nhận thưởng. */
  cleanClaimed?: number;
  /** Đợt nhờ vả khách quen (GĐ80): regularId → trạng thái câu chuyện 2–4 ngày. */
  regularArcs?: Record<string, import('./regularArc').RegularArcState>;
  /** Chuyện sự kiện bất ngờ đang kể dở (GĐ164): MỘT slot duy nhất. Bản lưu cũ thiếu →
   *  undefined (chưa có arc nào, không cần SAVE_VERSION — biz nằm trong MERGE_DEEP). */
  surpriseArc?: import('./surpriseArcs').SurpriseArcState;
  /** Các arc sự kiện ĐÃ kể (kể xong lẫn khép sớm — GĐ164): không kể lại. Bản lưu cũ thiếu → []. */
  surpriseArcsTold?: string[];
}

/** Sự kiện thử thách theo mùa (GĐ75). */
export interface SeasonEventState {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  /** Tổng sao gom được trong mùa (mỗi ngày hoàn mục tiêu +1). */
  stars: number;
  /** dayIndex (0–4) của mùa đã nhận thưởng — chống nhận 2 lần/ngày. */
  claimedDay?: number;
}

export const newBiz = (): BizState => ({
  rival: null, rivalsBeaten: 0, rivalNextDay: 0, rivalTrend: [], counter: null, counterReady: {}, ads: [],
  loyalty: { on: false, stamps: 10, redeemed: 0, given: 0 },
  loan: null, hui: null, week: emptyWeek(1), lastWeek: null, weekStreak: 0,
  month: emptyMonth(1, monthOf(1)), lastMonth: null, monthStreak: 0,
  year: emptyYear(1, 1), lastYear: null,
  pets: {}, achievements: [], perfectDays: 0,
  surprise: null, surpriseDay: 0, story: {}, storyPending: null,
  home: [], vehicle: 'none', breakfastDay: 0,
  chapters: [], chapterPending: null, counterKills: 0, tutorialOff: false, prestige: { level: 0, bonus: 0, goalsClaimed: [] }, services: [], upgrades: [],
  quanNuoc: newQuanNuoc(),
  discoveryClaimed: [],
  landmark: { contributions: 0, lastContributeDay: 0 },
  demographics: {},
  unlockActs: [],
  serviceLife: {},
  supplierRel: {},
  supplierRelMonth: {},
  fairTaken: undefined,
  triAnMonth: 0,
  triAnPaidMonth: undefined,
  prepClaimed: undefined,
  hiepLuc: { m: 0, active: false, coc: 0 },
  hiepLucMonth: 0,
  hiepLucStreak: 0,
  seasonEvt: undefined,
  cleanStreak: 0, cleanBest: 0, cleanClaimed: 0, regularArcs: {},
  seasonAlmanac: {}, almanacClaimed: [],
});

/** Hệ số đi bộ của chủ tiệm hôm nay: nhà đẹp ngủ ngon, ăn sáng, xe (chỉ khi ở ngoài đường). */
export function playerPace(b: BizState, day: number, outdoors: boolean) {
  let pace = 1 + homeRest(b.home) + (b.breakfastDay === day ? BREAKFAST.speed : 0);
  if (outdoors) pace += vehicleDef(b.vehicle)?.speed ?? 0;
  return pace;
}

/** Lượng khách ghé chung: đối thủ, quảng cáo, thẻ tích điểm, đợt phản công đang chạy, khách cũ của rival đã mua lại. */
export const bizTraffic = (b: BizState, day: number) => rivalTrafficFactor(b.rival, day) * adsTraffic(b.ads, day)
  * loyaltyTraffic(b.loyalty) * (counterActive(b.counter, day, 'ad') ? COUNTER_AD_TRAFFIC : 1)
  * (b.rivalBuyUntil !== undefined && day <= b.rivalBuyUntil ? RIVAL_BUY_TRAFFIC : 1);

// ───────────────────────── Nhịp tháng vận hành ─────────────────────────
export interface MonthPace {
  pace: number;
  remainingDays: number;
  projected: number;
  onTrack: boolean;
  streakAtRisk: boolean;
  streakXp: number;
  missing: number;
}

export function monthPace(
  current: number, target: number, remainingDays: number, totalDaysInMonth: number, streak: number, level: number,
): MonthPace | null {
  if (target <= 0 || remainingDays <= 0 || totalDaysInMonth <= 0) return null;
  const elapsed = totalDaysInMonth - remainingDays;
  const projected = elapsed > 0 ? (current * totalDaysInMonth) / elapsed : current;
  const onTrack = projected >= target;
  const missing = Math.max(0, target - current);
  return {
    pace: target > 0 ? current / target : 0,
    remainingDays,
    projected,
    onTrack,
    streakAtRisk: !onTrack && streak >= 1 && current < target,
    streakXp: streak + 1 >= STREAK_XP_FROM ? Math.round(STREAK_XP_RATE_MONTH * xpToNext(level)) : 0,
    missing,
  };
}
