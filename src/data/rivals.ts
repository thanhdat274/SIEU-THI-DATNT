/** Tiệm đối thủ (GĐ959): tách nguyên văn khỏi biz.ts; biz.ts vẫn re-export nên import cũ không đổi. */
import { productById } from './products';
import { regularById } from './regulars';
import { EMOTIONAL_FRIENDSHIP } from './regularTrust';
import { tiesOf, otherOf } from './regularTies';
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
  /** "Lung lay" (GĐ Hệ2-L6): họ hàng/bạn bè của người vừa bị kéo — id → đêm hết hạn (3 đêm xác suất bị kéo ×2). */
  poachLungLay?: Record<string, number>;
  /** "Miễn dịch cụm" (GĐ Hệ2-L6): đòi về một người → cả cụm id → đêm hết hạn (7 ngày không bị kéo). */
  poachImmune?: Record<string, number>;
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
/** Cổng mở cơ chế "lôi kéo theo cụm" (SPEC 2.7, R1: ≥32 nên golden L30 không đổi). */
export const POACH_CLUSTER_UNLOCK = 32;
/** "Lung lay" kéo dài 3 đêm; trong lúc lung lay xác suất bị kéo nhân đôi. */
export const POACH_LUNG_LAY_NIGHTS = 3;
export const POACH_LUNG_LAY_MULT = 2;
/** Đòi về một người → cả cụm miễn bị kéo 7 ngày. */
export const POACH_IMMUNE_DAYS = 7;
/** Mỗi "mỏ neo" (thân thiết ≥ EMOTIONAL_FRIENDSHIP) giảm 25% xác suất bị kéo của người có cạnh với họ. */
export const POACH_ANCHOR_REDUCE = 0.25;
/** GĐ794 — khách quen đang "dễ bị kéo": rival đủ mạnh, còn chỗ (<3 người), khách mới quen (thân thiết < mốc) và chưa bị kéo.
 *  Cùng điều kiện với rivalNightAI nên cảnh báo không hứa hão; thuần, dùng chung chơi đơn/hẻm online. */
export function atRiskOfPoach(rival: Rival | null | undefined, friendships: Record<string, number | undefined>): string[] {
  if (!rival || rival.strength < 35) return [];
  const poached = rival.poached ?? {};
  if (Object.keys(poached).length >= 3) return [];
  return Object.entries(friendships)
    .filter(([id, f]) => f !== undefined && f < POACH_FRIENDSHIP && !poached[id])
    .map(([id]) => id);
}
/** "Cụm" của một người: họ hàng/bạn bè (các cạnh KHÔNG khắc khẩu) — SPEC 2.7 "cả cụm". THUẦN. */
export function poachClusterNeighbors(regularId: string): string[] {
  return tiesOf(regularId).filter((t) => t.kind !== 'khac_khau').map((t) => otherOf(t, regularId));
}
/** Số "mỏ neo" (thân thiết ≥ EMOTIONAL_FRIENDSHIP) nối cạnh với người này — mỗi mỏ neo giảm 25%
 *  xác suất bị kéo của người có cạnh với họ (SPEC 2.7). THUẦN. */
export function anchorCountFor(regularId: string, friendships: Record<string, number>): number {
  return tiesOf(regularId).filter((t) => (friendships[otherOf(t, regularId)] ?? 0) >= EMOTIONAL_FRIENDSHIP).length;
}
/** Ai đang "lung lay" (SPEC 2.7) — CẢNH BÁO HUD: họ hàng/bạn bè của người vừa bị kéo (còn trong vòng
 *  3 đêm), thân < POACH_FRIENDSHIP, chưa bị kéo. Điều kiện trùng rivalNightAI nên không hứa hão. THUẦN. */
export function poachLungLayOf(
  rival: Rival | null | undefined,
  friendships: Record<string, number>,
  level = 0,
  day = 0,
): string[] {
  if (!rival || level < POACH_CLUSTER_UNLOCK) return [];
  const poached = rival.poached ?? {};
  return Object.entries(rival.poachLungLay ?? {})
    .filter(([id, until]) => until > day && !poached[id] && (friendships[id] ?? 0) < POACH_FRIENDSHIP)
    .map(([id]) => id);
}
/** Rival mạnh quá mốc này mới dám giựt nhân viên (chỉ rival máu liều). */
export const STAFF_POACH_STRENGTH = 60;
export const STAFF_POACH_CHANCE = 0.04;
/** GĐ1185 — nhân viên đang bị rival máu liều "để mắt": rival đủ mạnh (≥ STAFF_POACH_STRENGTH) sẽ móc
 *  NHÂN VIÊN GIỎI NHẤT của mình (đúng đích rivalNightAI chọn: sort theo skill giảm, lấy đầu). Trả về id
 *  người bị nhắm (undefined khi chưa có nguy cơ). Song song `atRiskOfPoach` (khách quen, GĐ794) — THUẦN đọc,
 *  cùng điều kiện nên cảnh báo không hứa hão, dùng chung chơi đơn/hẻm online. Không đổi kinh tế/save/seed. */
export function staffAtRiskOfPoach(rival: Rival | null | undefined, staff: { id: number; skill: number }[]): number | undefined {
  if (!rival || rival.personality !== 'aggressive' || rival.strength < STAFF_POACH_STRENGTH) return undefined;
  if (!staff.length) return undefined;
  return [...staff].sort((a, b) => b.skill - a.skill)[0].id;
}
/** Đòi lại khách quen bị lôi kéo: tặng 1 món họ thích trong kho + tiền quà, mỗi ngày đòi được 1 người.
 *  Thân thiết cộng lại khi đòi được (đường chờ tự quay về thì +5 nhưng ngẫu nhiên). */
export const RESCUE_FEE = 20000;
export const RESCUE_FRIENDSHIP = 3;
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

/** GĐ725 — tổng chênh giá rival đang phá giá trên các món trong giỏ (chỉ món rival đang bán rẻ hơn ≥5%):
 *  dùng cho kèo "khớp giá" ở quầy — khách nói rival rẻ hơn, chủ chọn khớp (mất gap, giữ khách) hay giữ giá. */
export function rivalPriceGap(r: Rival | null, priceOf: (id: string) => number, day: number, basketIds: string[]): number {
  const under = rivalUndercuts(r, priceOf, day);
  let gap = 0;
  for (const id of basketIds) if (under.has(id)) gap += Math.max(0, priceOf(id) - (r?.prices?.[id] ?? priceOf(id)));
  return Math.round(gap / 1000) * 1000;
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
  /** Cấp người chơi — cổng mở cơ chế "lôi kéo theo cụm" (SPEC 2.7, R1: < POACH_CLUSTER_UNLOCK thì tắt). */
  level?: number;
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
      const back = regularById(id);
      news.push(`💛 ${back?.name ?? 'Một khách quen'} chán ${r.name}, quay lại tiệm mình!`);
    }
  }
  if (r.strength >= 35 && Object.keys(poached).length < 3) {
    // "Lôi kéo theo cụm" (SPEC 2.7): cụm vừa đòi về được miễn trong 7 ngày — loại khỏi đối tượng.
    const cluster = (ctx.level ?? 0) >= POACH_CLUSTER_UNLOCK;
    const immune = next.poachImmune ?? {};
    const candidates = Object.entries(ctx.friendships)
      .filter(([id, f]) => f < POACH_FRIENDSHIP && !poached[id] && f !== undefined && (cluster ? !(immune[id] != null && immune[id] > ctx.day) : true))
      .sort((a, b) => a[1] - b[1]);
    const victim = candidates[0];
    if (victim) {
      // Xác suất kéo: cơ bản × (sức/100) × tính cách, nhân theo cụm khi đã mở (lung lay ×2, mỏ neo ×0.75 mỗi neo)
      let chance = POACH_CHANCE * (r.strength / 100) * (pers === 'aggressive' ? 1.6 : pers === 'quality' ? 0.5 : 1);
      if (cluster) {
        const lungLay = next.poachLungLay ?? {};
        if ((lungLay[victim[0]] ?? 0) > ctx.day) chance *= POACH_LUNG_LAY_MULT;
        chance *= Math.pow(1 - POACH_ANCHOR_REDUCE, anchorCountFor(victim[0], ctx.friendships));
      }
      if (rng() < chance) {
        poached[victim[0]] = ctx.day;
        const def = regularById(victim[0]);
        // Lôi kéo theo cụm: họ hàng/bạn bè còn xa lạ của người vừa bị kéo thành "lung lay" 3 đêm
        if (cluster) {
          const ll = { ...(next.poachLungLay ?? {}) };
          const until = ctx.day + POACH_LUNG_LAY_NIGHTS;
          for (const nb of poachClusterNeighbors(victim[0])) {
            if ((ctx.friendships[nb] ?? 0) < POACH_FRIENDSHIP && !poached[nb]) ll[nb] = until;
          }
          if (Object.keys(ll).length) next.poachLungLay = ll;
        }
        news.push(`😠 ${r.name} lôi kéo ${def?.name ?? 'một khách quen'} — mở Khách quen để đòi về`);
      }
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
