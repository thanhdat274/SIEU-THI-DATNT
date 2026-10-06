/** Cấp độ người chơi: EXP tích lũy theo mốc; 60 cấp: cấp 1–25 giữ nhịp cũ nhưng XP x1,5; cấp 26–60 tăng ~4%/cấp. Số liệu provisional, chưa playtest. */
export const MAX_PLAYER_LEVEL = 60;

/** Tổng XP tại đầu mỗi cấp, index 0 là cấp 1. */
export const LEVEL_XP_THRESHOLDS: readonly number[] = [
  0, 120, 300, 540, 840, 1200, 1620, 2100, 2670, 3300,
  4350, 5450, 6590, 7770, 9000, 10280, 11600, 12960, 14370, 15830,
  17100, 18530, 20100, 21830, 23700, 25730, 27830, 30030, 32330, 34680,
  37130, 39680, 42330, 45130, 48030, 51030, 54180, 57430, 60830, 64330,
  67980, 71780, 75730, 79830, 84130, 88580, 93230, 98030, 103030, 108230,
  113630, 119280, 125130, 131230, 137580, 144180, 151030, 158130, 165530, 173230,
];

/** Số chỗ nhân viên mở theo cấp; giữ mức 0/1/2 đã có, sau đó tăng đơn điệu. */
export const STAFF_SLOT_MILESTONES: Readonly<Record<number, number>> = {
  1: 0, 2: 1, 3: 2, 10: 3, 12: 4, 15: 4, 20: 6, 21: 7, 22: 8,
  25: 9, 26: 10, 30: 11, 35: 12, 40: 13, 46: 14, 52: 15, 60: 16,
};

/** Hệ số lưu lượng theo các mốc cao cấp; giá trị tham khảo được giới hạn ở nhịp spawn trong core. */
export const LEVEL_TRAFFIC_MILESTONES: Readonly<Record<number, number>> = {
  1: 1, 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.4, 6: 1.5, 7: 1.6, 8: 1.7, 9: 1.8, 10: 2, 11: 2.3, 12: 3, 13: 3.3, 14: 3.6, 15: 4, 16: 4.3,
  17: 4.6, 18: 4.9, 19: 5.2, 20: 5.5, 21: 5.7, 22: 5.9, 23: 6.1,
  24: 6.3, 25: 6.5,
  26: 6.6, 27: 6.7, 28: 6.8, 29: 6.9, 30: 7.0, 31: 7.1, 32: 7.2, 33: 7.3,
  34: 7.4, 35: 7.5, 36: 7.6, 37: 7.7, 38: 7.8, 39: 7.9, 40: 8.0, 41: 8.1,
  42: 8.2, 43: 8.3, 44: 8.4, 45: 8.5, 46: 8.6, 47: 8.7, 48: 8.8, 49: 8.9,
  50: 9.0, 51: 9.1, 52: 9.2, 53: 9.3, 54: 9.4, 55: 9.5, 56: 9.6, 57: 9.7,
  58: 9.8, 59: 9.9, 60: 10.0,
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
  return level >= 40 ? 8 : level >= 30 ? 7 : level >= 20 ? 6 : level >= 15 ? 5 : level >= 10 ? 4 : level >= 5 ? 3 : 2;
}

/** XP từ bán hàng giảm ở cấp cao để đường cong không tăng tốc quá mức. */
export function saleExperienceMultiplier(level: number): number {
  return level >= 40 ? 0.55 : level >= 20 ? 0.7 : 1;
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
