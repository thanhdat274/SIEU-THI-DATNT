/**
 * Báo cáo & thử thách tuần/tháng: sổ tuần, tổng kết tuần, thử thách, chuỗi tuần/tháng.
 * Tách từ `data/biz.ts` (GĐ972) — `biz.ts` vẫn xuất lại toàn bộ nên chỗ dùng cũ không đổi.
 */
import { formatMoney } from './products';
import { xpToNext } from './levels';
import { onlineOrderCap } from './online';
import { expectedCookOrdersPerDay } from './phoneOrders';

/** GĐ1641: trần đơn app khả thi trong N ngày (70% trần 5★) — giữ thử thách đơn app làm được ở cấp cao. */
const onlineCap = (lv: number, days: number) => Math.max(1, Math.floor(onlineOrderCap(5, lv) * days * 0.7));

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
    target: (lv) => Math.min(10 + lv, onlineCap(lv, 7)), reward: (lv) => round1k(160000 * (1 + 0.25 * (lv - 1))) },
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
    target: (lv) => Math.max(1, Math.min(4 + lv, Math.floor(expectedCookOrdersPerDay(lv) * 7 * 0.7))), reward: (lv) => round1k(170000 * (1 + 0.25 * (lv - 1))) },
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
    target: (lv) => Math.min(60 + 5 * lv, onlineCap(lv, 28)), reward: (lv) => round1k(900000 * (1 + 0.25 * (lv - 1))) },
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
