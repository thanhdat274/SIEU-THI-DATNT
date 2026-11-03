/** Phản công đối thủ, thẻ tích điểm, quảng cáo, vay vốn và hụi: dữ liệu và hàm thuần (tách từ data/biz.ts, GĐ982). */
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

