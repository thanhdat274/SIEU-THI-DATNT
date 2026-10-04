/** Cấp độ người chơi: EXP tích lũy theo mốc; dữ liệu 35 cấp được chọn lọc từ game tham khảo. */
export const MAX_PLAYER_LEVEL = 35;

/** Tổng XP tại đầu mỗi cấp, index 0 là cấp 1. */
export const LEVEL_XP_THRESHOLDS: readonly number[] = [
  0, 80, 200, 360, 560, 800, 1080, 1400, 1780, 2200,
  2900, 3630, 4390, 5180, 6000, 6850, 7730, 8640, 9580, 10550,
  11400, 12350, 13400, 14550, 15800, 17150, 18600, 20150, 21800, 23550,
  25500, 27600, 29900, 32400, 35200,
];

/** Số chỗ nhân viên mở theo cấp; giữ mức 0/1/2 đã có, sau đó tăng đơn điệu. */
export const STAFF_SLOT_MILESTONES: Readonly<Record<number, number>> = {
  1: 0, 2: 1, 3: 2, 10: 3, 12: 4, 15: 4, 20: 6, 21: 7, 22: 8,
  25: 9, 26: 10, 30: 11, 31: 12, 33: 13, 34: 14, 35: 16,
};

/** Hệ số lưu lượng theo các mốc cao cấp; giá trị tham khảo được giới hạn ở nhịp spawn trong core. */
export const LEVEL_TRAFFIC_MILESTONES: Readonly<Record<number, number>> = {
  1: 1, 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.4, 6: 1.5, 7: 1.6, 8: 1.7, 9: 1.8, 10: 2, 11: 2.3, 12: 3, 13: 3.3, 14: 3.6, 15: 4, 16: 4.3,
  17: 4.6, 18: 4.9, 19: 5.2, 20: 5.5, 21: 5.7, 22: 5.9, 23: 6.1,
  24: 6.3, 25: 6.5, 26: 6.7, 27: 6.9, 28: 7.1, 29: 7.3, 30: 7.5,
  31: 7.7, 32: 7.9, 33: 8.1, 34: 8.3, 35: 8.5,
};

export function xpForLevel(level: number): number {
  return LEVEL_XP_THRESHOLDS[Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level))) - 1];
}

export function xpToNextLevel(level: number): number {
  const current = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level)));
  return current >= MAX_PLAYER_LEVEL ? 0 : xpForLevel(current + 1) - xpForLevel(current);
}

export function staffSlotsAtLevel(level: number): number {
  const current = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level)));
  let slots = 0;
  for (const [milestone, count] of Object.entries(STAFF_SLOT_MILESTONES)) {
    if (Number(milestone) <= current) slots = Math.max(slots, count);
  }
  return slots;
}

export function getLevelTrafficMultiplier(level: number): number {
  const current = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level)));
  let multiplier = 1;
  for (const [milestone, value] of Object.entries(LEVEL_TRAFFIC_MILESTONES)) {
    if (Number(milestone) <= current) multiplier = value;
  }
  return multiplier;
}

/** Nới sức chứa theo mốc để tiệm đông dần mà lối đi nhỏ vẫn đọc được. */
export function maxActiveCustomersForLevel(level: number): number {
  return level >= 20 ? 6 : level >= 15 ? 5 : level >= 10 ? 4 : level >= 5 ? 3 : 2;
}

/** XP từ bán hàng giảm ở cấp cao để đường cong không tăng tốc quá mức. */
export function saleExperienceMultiplier(level: number): number {
  return level >= 30 ? 0.55 : level >= 20 ? 0.7 : 1;
}

/** Prestige sau cấp tối đa. Số liệu provisional, chưa playtest. */
export const PRESTIGE_XP_PER_STAR = 5000;
export const PRESTIGE_MAX_STARS = 10;
/** Mỗi sao tăng lưu lượng khách 2% (tối đa +20%); không tăng XP hay doanh thu trực tiếp nên không tạo vòng lặp XP. */
export const PRESTIGE_TRAFFIC_PER_STAR = 0.02;

export function prestigeTrafficMultiplier(stars: number): number {
  const clamped = Math.max(0, Math.min(PRESTIGE_MAX_STARS, Number.isFinite(stars) ? Math.floor(stars) : 0));
  return 1 + clamped * PRESTIGE_TRAFFIC_PER_STAR;
}
