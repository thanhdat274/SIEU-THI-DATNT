/**
 * Các hệ thống kinh doanh & đời sống thêm vào sau: tiệm đối thủ, thẻ tích điểm, quảng cáo, vay vốn, hụi,
 * báo cáo tuần, thú cưng, thành tựu, sự kiện bất ngờ, chuyện khách quen, nhà riêng, bữa sáng, xe cộ.
 * File này chỉ có dữ liệu và hàm thuần; hành động đổi trạng thái nằm ở `core/biz.ts`.
 */
import { formatMoney } from './products';
import { newQuanNuoc, type QuanNuocState } from './quanNuoc';
import { newTiemXoi, type TiemXoiState } from './tiemXoi';
import type { HiepLucState } from './hiepLuc';
import { monthOf } from './calendar';
import { emptyYear } from './yearReport';
import { xpToNext } from './levels';

import { RIVAL_BUY_TRAFFIC, rivalTrafficFactor, type Rival, type RivalPersonality, type RivalTrendDay } from './rivals';
export * from './rivals';
import { emptyMonth, emptyWeek, STREAK_XP_FROM, STREAK_XP_RATE_MONTH, type MonthReport, type MonthTally, type WeekReport, type WeekTally } from './bizWeeks';
export * from './bizWeeks';

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
/** Chó giữ nhà giảm trộm/tiền giả; mèo giảm hỏng hàng — đặt ở data để core/stock không import vòng qua core/biz. */
export const theftFactor = (b: { pets: Record<string, PetState | undefined> }, day: number) => (petActive(b.pets.dog, day) ? 0.45 : 1);
export const spoilFactor = (b: { pets: Record<string, PetState | undefined> }, day: number) => (petActive(b.pets.cat, day) ? 0.8 : 1);

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
  /** GĐ464: bậc cửa hàng nước (0..2) và tiệm xôi đã mở rộng — tuỳ chọn để ctx test cũ vẫn hợp lệ. */
  quanTier?: number;
  xoiBig?: boolean;
  xoiDine?: number;
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
  { id: 'quan_cafe', icon: '☕', name: 'Quán cà phê', desc: 'Nâng cửa hàng nước lên Quán cà phê', reward: 2000000, done: (c) => (c.quanTier ?? 0) >= 2 },
  { id: 'xoi_big', icon: '🍚', name: 'Bếp xôi lớn', desc: 'Mở rộng bếp tiệm xôi', reward: 1500000, done: (c) => !!c.xoiBig },
  { id: 'xoi_dine', icon: '🪑', name: 'Quán xôi đông khách', desc: 'Phục vụ 500 suất ăn tại tiệm xôi', reward: 1000000, done: (c) => (c.xoiDine ?? 0) >= 500 },
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
export const loadStories = () => Promise.all([import('./stories'), import('./surpriseArcsData'), import('./surpriseArcs')])
  .then(([m, d, a]) => { STORIES = m.STORIES; SURPRISES = m.SURPRISES; a.setSurpriseArcs(d.SURPRISE_ARCS); });

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
  /** Ngày gần nhất đã đòi lại một khách quen bị rival lôi kéo (mỗi ngày một người). Thiếu ở save cũ. */
  rescueDay?: number;
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
  /** Tiệm xôi (GĐ410): xưởng nấu xôi số lượng lớn đổ vào kho chung mỗi đêm. */
  tiemXoi: TiemXoiState;
  /** GĐ498: các khu bản đồ đã mở (ngoài hẻm đầu). */
  zones?: string[];
  /** GĐ501: số lô sạp hàng rong đã thuê ở Ngõ 2 (0–4). */
  sapRong?: number;
  /** GĐ507: món từng lô sạp (id SAP_KINDS); thiếu = Tổng hợp. */
  sapKinds?: string[];
  /** GĐ513: bậc từng lô sạp (0 gánh, 1 xe đẩy, 2 quầy); thiếu = gánh. */
  sapTiers?: number[];
  /** GĐ521: ngày chủ tự đứng sạp gần nhất. */
  sapHandDay?: number;
  tiemXoiLast?: { day: number; total: number; cost: number; wages: number; saved: number; /** GĐ486: suất khách ăn tại chỗ. */ dine?: number; /** GĐ711: sự kiện hôm qua (nồi hỏng / gạo khan) — bản lưu cũ thiếu thì coi như không có. */ event?: 'cooker' | 'gao' };
  /** Kết quả ngày vừa rồi của quán nước (để UI hiển thị); chưa từng chạy thì undefined.
   *  wages = tổng lương nhân viên phải trả hôm đó, profit = revenue − wages (lời ròng thật). */
  quanNuocLast?: { day: number; revenue: number; served: number; wanted: number; wages: number; profit: number; /** GĐ703: sự kiện hôm qua (máy pha hỏng / xe nước) — bản lưu cũ thiếu thì coi như không có. */ event?: 'brewer' | 'cart' };
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
  tiemXoi: newTiemXoi(),
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
