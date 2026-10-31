import { simRng } from '../core/rand';
/**
 * Giữ chân người chơi: điểm danh mỗi ngày nhận quà tăng dần theo chuỗi 7 ngày,
 * và mỗi ngày một lượt vòng quay may mắn. Chỉ có dữ liệu; nhận/quay nằm ở `core/store`.
 */

/** Một phần quà điểm danh (tiền hoặc XP). */
export interface DailyGift {
  icon: string;
  label: string;
  money?: number;
  xp?: number;
}

/** Chuỗi 7 ngày: ngày 7 là rương lớn, sau đó lặp lại. */
export const DAILY_GIFTS: DailyGift[] = [
  { icon: '🪙', label: 'Vốn nhỏ', money: 5000 },
  { icon: '⭐', label: '20 XP', xp: 20 },
  { icon: '🪙', label: 'Đủng đỉnh', money: 10000 },
  { icon: '⭐', label: '40 XP', xp: 40 },
  { icon: '🛍️', label: 'Bao hàng', money: 25000 },
  { icon: '⭐', label: '60 XP', xp: 60 },
  { icon: '🎁', label: 'Rương vàng', money: 100000 },
];

/** Một ô giải trên vòng quay (trọng số càng lớn càng hay trúng). */
export interface WheelPrize {
  icon: string;
  label: string;
  /** Nhãn ngắn gọn in trên ô vòng quay cho đỡ rối. */
  short: string;
  money?: number;
  xp?: number;
  /** Hôm nay khách ghé đông thêm chừng này phần (0.2 = +20%). */
  boost?: number;
  weight: number;
}

export const WHEEL_PRIZES: WheelPrize[] = [
  { icon: '🪙', label: '5.000đ', short: '5k', money: 5000, weight: 22 },
  { icon: '⭐', label: '30 XP', short: '30XP', xp: 30, weight: 14 },
  { icon: '🪙', label: '10.000đ', short: '10k', money: 10000, weight: 18 },
  { icon: '🍀', label: 'Khách +20% hôm nay', short: 'Đông khách', boost: 0.2, weight: 8 },
  { icon: '🪙', label: '20.000đ', short: '20k', money: 20000, weight: 14 },
  { icon: '⭐', label: '60 XP', short: '60XP', xp: 60, weight: 8 },
  { icon: '💰', label: '50.000đ', short: '50k', money: 50000, weight: 10 },
  { icon: '🏆', label: '120.000đ', short: '120k', money: 120000, weight: 6 },
];

/** Mô tả phần quà để thông báo. */
export const giftText = (g: DailyGift | WheelPrize) =>
  [g.money ? formatMoney(g.money) : '', g.xp ? `${g.xp} XP` : '', 'boost' in g && g.boost ? 'khách đông hơn hôm nay' : ''].filter(Boolean).join(' + ');

const formatMoney = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;

/** Quà của ngày trong chuỗi: chuỗi 1–7, dài hơn thì lặp lại vòng sau. */
export const giftOfStreak = (streak: number) => DAILY_GIFTS[(Math.max(1, streak) - 1) % DAILY_GIFTS.length];

/** Hệ số tiền quà theo cấp: 5 cấp đầu giữ nguyên, mỗi cấp sau +6%, trần ×5 (chạm khoảng cấp ≥85). */
export const giftMoneyScale = (level: number) => Math.min(5, 1 + Math.max(0, level - 5) * 0.06);

/** Hệ số XP quà theo cấp: từ cấp 6 mỗi cấp +15%, trần ×12. */
export const giftXpScale = (level: number) => Math.min(12, 1 + Math.max(0, level - 5) * 0.15);

// ── Thưởng theo nền kinh tế (giữ quà điểm danh "đáng" với tiệm càng lớn) ──
/** Lợi nhuận bình quân/ngày (7 ngày gần) tối thiểu để bắt đầu cộng hệ số thưởng kinh tế. */
export const GIFT_ECO_FLOOR = 2_000_000;
/** Nền kinh tế tăng thêm bao nhiêu thì hệ số thưởng kinh tế +1 (đến trần GIFT_ECO_CAP). */
export const GIFT_ECO_STEP = 2_000_000;
/** Trần hệ số thưởng kinh tế — chặn lạm phát (rương vàng ×5, gộp với level scale, vẫn có hạn). */
export const GIFT_ECO_CAP = 5;

/**
 * Hệ số thưởng tiền theo nền kinh tế gần đây: lợi nhuận bình quân 1 ngày của 7 ngày vừa rồi.
 * Ván mới / tiệm bé (chưa tới GIFT_ECO_FLOOR) trả 1 để giữ hành vi cũ; từ mốc đó mỗi
 * GIFT_ECO_STEP lãi thêm +1 đến trần GIFT_ECO_CAP. Nhờ đó quà điểm danh không thành "tiền lẻ"
 * với kỳ cựu nhưng không bùng nổ nền kinh tế.
 */
export function giftEcoScale(avgDailyProfit: number): number {
  if (!(avgDailyProfit > 0) || avgDailyProfit <= GIFT_ECO_FLOOR) return 1;
  return Math.min(GIFT_ECO_CAP, 1 + Math.ceil((avgDailyProfit - GIFT_ECO_FLOOR) / GIFT_ECO_STEP));
}

/** Lợi nhuận bình quân/ngày từ lịch sử `history` (tối đa 7 ngày gần nhất, chỉ lấy ngày có lãi). */
export function recentAvgProfit(history: { profit: number }[]): number {
  const recent = history.slice(-7).filter((h) => h.profit > 0);
  if (!recent.length) return 0;
  return recent.reduce((s, h) => s + h.profit, 0) / recent.length;
}

/** Lãi BÁN HÀNG bình quân/ngày (7 ngày gần, chỉ ngày dương) — đọc `salesProfit`; save cũ thiếu trường
 *  thì rơi về `profit`. Dùng để neo thưởng nhiệm vụ (questEcoCap). */
export function recentAvgSalesProfit(history: { profit: number; salesProfit?: number }[]): number {
  return recentAvgProfit(history.map((h) => ({ profit: h.salesProfit ?? h.profit })));
}

/** Bản sao quà tiền đã scale theo cấp VÀ theo nền kinh tế; XP chỉ theo cấp. */
export const scaledGiftEco = (g: DailyGift, level: number, avgDailyProfit = 0): DailyGift => ({
  ...scaledGift(g, level),
  ...(g.money !== undefined ? { money: roundThousand(g.money * giftMoneyScale(level) * giftEcoScale(avgDailyProfit)) } : {}),
});

/** Làm tròn tiền tới 1.000đ cho gọn mắt. */
const roundThousand = (v: number) => Math.round(v / 1000) * 1000;

/** Bản sao quà đã scale theo cấp: tiền làm tròn nghìn, XP làm tròn số nguyên; không có money/xp thì giữ undefined. */
export const scaledGift = (g: DailyGift, level: number): DailyGift => ({
  ...g,
  ...(g.money !== undefined ? { money: roundThousand(g.money * giftMoneyScale(level)) } : {}),
  ...(g.xp !== undefined ? { xp: Math.round(g.xp * giftXpScale(level)) } : {}),
});

/**
 * Bản sao giải vòng quay đã scale theo cấp. Label gốc của giải là chuỗi tiền cứng nên phải
 * ghi đè label/short theo giá trị mới; ô giải 🍀 (không money/xp) giữ nguyên label/short.
 */
export const scaledPrize = (p: WheelPrize, level: number): WheelPrize => {
  const next: WheelPrize = {
    ...p,
    ...(p.money !== undefined ? { money: roundThousand(p.money * giftMoneyScale(level)) } : {}),
    ...(p.xp !== undefined ? { xp: Math.round(p.xp * giftXpScale(level)) } : {}),
  };
  if (next.money !== undefined) {
    next.label = formatMoney(next.money);
    next.short = `${Math.round(next.money / 1000)}k`;
  } else if (next.xp !== undefined) {
    next.label = `${next.xp} XP`;
    next.short = `${next.xp}XP`;
  }
  return next;
};

/** Xoay một lượt: chọn giải theo trọng số. */
export function spinWheelPrize(): WheelPrize {
  const total = WHEEL_PRIZES.reduce((n, p) => n + p.weight, 0);
  let roll = simRng()() * total;
  for (const p of WHEEL_PRIZES) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return WHEEL_PRIZES[WHEEL_PRIZES.length - 1];
}

// ── "Chào mừng quay lại" (GĐ39): thưởng khi quay lại sau ≥2 ngày thật vắng mặt ──
/** Số mili-giây trong một ngày thật dùng để đếm số ngày vắng mặt. */
const DAY_MS = 24 * 60 * 60 * 1000;
/** Vắng từ bấy nhiêu ngày THẬT trở lên mới được thưởng; chơi hằng ngày (< 2) không bao giờ thấy. */
export const WELCOME_BACK_MIN_DAYS = 2;
/** Thưởng tính tối đa bấy nhiêu ngày vắng — nhìn xa hơn cũng không tăng thêm (chống lạm phát). */
export const WELCOME_BACK_MAX_DAYS = 7;
/** Tầng dưới theo cấp cho tiệm mới chưa có lịch sử lãi: levelFloor = level × hằng số này. */
export const WELCOME_BACK_PER_LEVEL_FLOOR = 2000;
/** Trần cứng một lần thưởng — không bao giờ vượt, chặn lạm phát nền kinh tế. */
export const WELCOME_BACK_CAP = 20_000_000;

/**
 * Số ngày THẬT đã trôi từ lần ghé cuối (lastSeenAt epoch ms) tới `now`, làm tròn xuống nguyên ngày.
 * lastSeenAt thiếu/0 (mới bắt đầu hoặc bản lưu cũ) trả 0; `now` trước lastSeenAt hoặc nhỏ hơn 0 cũng 0.
 */
export function daysAway(now: number, lastSeenAt: number): number {
  if (!(lastSeenAt > 0) || !(now > 0)) return 0;
  const ms = now - lastSeenAt;
  if (ms <= 0) return 0;
  return Math.floor(ms / DAY_MS);
}

/**
 * Khoản thưởng một lần khi quay lại: mô tả "tiệm kiếm được lúc chủ vắng".
 *  - < WELCOME_BACK_MIN_DAYS ngày → 0 (chơi hằng ngày không có thưởng).
 *  - nền = max(avgProfit, level × WELCOME_BACK_PER_LEVEL_FLOOR) — avgProfit từ recentAvgProfit,
 *    cho tiệm mới chưa có lãi thì dùng tầng theo cấp để vẫn có thưởng tối thiểu;
 *  - lump = nền × min(daysAway, WELCOME_BACK_MAX_DAYS), làm tròn tới 1.000đ, trần WELCOME_BACK_CAP.
 * Không đổi theo chuỗi/điểm danh — là bonus độc lập, không phải một vòng lặp ngày mới.
 */
export function welcomeBackReward(daysAwayCount: number, level: number, avgProfit: number): number {
  if (daysAwayCount < WELCOME_BACK_MIN_DAYS) return 0;
  const levelFloor = Math.max(1, Math.floor(level)) * WELCOME_BACK_PER_LEVEL_FLOOR;
  const base = Math.max(avgProfit, levelFloor);
  const raw = base * Math.min(daysAwayCount, WELCOME_BACK_MAX_DAYS);
  const rounded = Math.round(raw / 1000) * 1000;
  return Math.min(rounded, WELCOME_BACK_CAP);
}
