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

/** Xoay một lượt: chọn giải theo trọng số. */
export function spinWheelPrize(): WheelPrize {
  const total = WHEEL_PRIZES.reduce((n, p) => n + p.weight, 0);
  let roll = Math.random() * total;
  for (const p of WHEEL_PRIZES) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return WHEEL_PRIZES[WHEEL_PRIZES.length - 1];
}
