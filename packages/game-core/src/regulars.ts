import { RegularCustomerProgress } from '@game/shared';
import { REGULAR_CUSTOMERS, RegularCustomerDefinition } from '@game/data';

function seedToNumber(seed: number | string): number {
  if (typeof seed === 'number') return seed;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

/**
 * Kiểm tra xem một khách quen có nên ghé tiệm hôm nay không dựa trên seed và tiến độ.
 * Đảm bảo tính deterministic (xác định) giữa các client.
 */
export function shouldRegularVisitToday(
  regular: RegularCustomerDefinition,
  day: number,
  worldSeed: number | string,
  progress?: RegularCustomerProgress
): boolean {
  if (day <= 0) return false;
  const numSeed = seedToNumber(worldSeed);
  // Khách quen không ghé 2 ngày liên tiếp nếu chưa đạt mốc thân thiết cao
  const hasFrequentPerk = progress?.unlockedPerks?.includes('frequent_visit') ||
    progress?.unlockedPerks?.some((p) => {
      const perkDef = regular.perks.find((item) => item.title === p);
      return perkDef?.effectType === 'frequent_visit';
    });

  if (!hasFrequentPerk && progress?.lastVisitDay && day - progress.lastVisitDay < 2) {
    return false;
  }

  // Hash xác định kết hợp worldSeed + day + regular.id
  let hash = (numSeed * 31 + day * 101) & 0x7fffffff;
  for (let i = 0; i < regular.id.length; i++) {
    hash = (hash * 33 + regular.id.charCodeAt(i)) & 0x7fffffff;
  }
  const roll = (hash % 100) / 100;

  // Xác suất cơ bản: khoảng 30% mỗi ngày; có perk thì tăng thêm
  const baseChance = 0.3;
  const visitBonus = hasFrequentPerk ? 0.2 : 0;
  return roll < (baseChance + visitBonus);
}

/**
 * Chọn một khách quen hợp lệ ghé tiệm trong ngày, tránh trùng với khách quen đang có mặt.
 */
export function pickAvailableRegular(
  day: number,
  worldSeed: number | string,
  currentlyInStoreRegularIds: string[],
  progressMap: Record<string, RegularCustomerProgress>
): RegularCustomerDefinition | null {
  const numSeed = seedToNumber(worldSeed);
  const candidates = REGULAR_CUSTOMERS.filter((reg) => {
    if (currentlyInStoreRegularIds.includes(reg.id)) return false;
    const prog = progressMap[reg.id];
    return shouldRegularVisitToday(reg, day, numSeed, prog);
  });

  if (candidates.length === 0) return null;

  // Chọn ứng viên theo hash
  const hash = Math.abs((numSeed * 17 + day * 37) % candidates.length);
  return candidates[hash];
}

export interface RegularCheckoutResult {
  updatedProgress: RegularCustomerProgress;
  pointsAwarded: number;
  newlyUnlockedPerks: string[];
  tipBonusRatio: number; // Tỉ lệ tiền boa (ví dụ: 0.1 cho 10%)
}

/**
 * Xử lý thanh toán cho khách quen: cộng điểm thân thiết (trần +2/ngày), mở khóa perk, thưởng tiền boa.
 */
export function processRegularCheckout(
  regularDef: RegularCustomerDefinition,
  progress: RegularCustomerProgress | undefined,
  basketProductIds: string[],
  day: number
): RegularCheckoutResult {
  const currentProg: RegularCustomerProgress = progress ? { ...progress, unlockedPerks: [...progress.unlockedPerks], discoveredProductIds: [...progress.discoveredProductIds] } : {
    id: regularDef.id,
    friendship: 0,
    unlockedPerks: [],
    discoveredProductIds: [],
    totalVisits: 0,
  };

  currentProg.totalVisits += 1;
  currentProg.lastVisitDay = day;

  // Khám phá món ưa thích đã mua
  for (const pid of basketProductIds) {
    if (regularDef.favoriteProductIds.includes(pid) && !currentProg.discoveredProductIds.includes(pid)) {
      currentProg.discoveredProductIds.push(pid);
    }
  }

  // Tính điểm thân thiết: có món ưa thích được +2, món thường được +1
  const hasFavorite = basketProductIds.some((pid) => regularDef.favoriteProductIds.includes(pid));
  let pointsToAdd = hasFavorite ? 2 : 1;

  // Giới hạn trần: tối đa +2 điểm thân thiết mỗi ngày từ mỗi khách quen
  if (currentProg.lastFriendshipDay === day) {
    pointsToAdd = 0; // Đã nhận điểm hôm nay
  }

  currentProg.friendship += pointsToAdd;
  if (pointsToAdd > 0) {
    currentProg.lastFriendshipDay = day;
  }

  // Kiểm tra mở khóa perk mới
  const newlyUnlockedPerks: string[] = [];
  for (const perk of regularDef.perks) {
    if (currentProg.friendship >= perk.threshold && !currentProg.unlockedPerks.includes(perk.title)) {
      currentProg.unlockedPerks.push(perk.title);
      newlyUnlockedPerks.push(perk.title);
    }
  }

  // Tính tiền boa bonus từ các perk đã mở khóa
  let tipBonusRatio = 0;
  for (const perkTitle of currentProg.unlockedPerks) {
    const perkDef = regularDef.perks.find((p) => p.title === perkTitle);
    if (perkDef?.effectType === 'bonus_tip') {
      tipBonusRatio += perkDef.value;
    }
  }

  return {
    updatedProgress: currentProg,
    pointsAwarded: pointsToAdd,
    newlyUnlockedPerks,
    tipBonusRatio,
  };
}

/**
 * Xử lý khi khách quen bỏ về (walkout) vì hết hàng hoặc đợi lâu.
 */
export function processRegularWalkout(
  regularDef: RegularCustomerDefinition,
  progress: RegularCustomerProgress | undefined,
  day: number
): RegularCustomerProgress {
  const currentProg: RegularCustomerProgress = progress ? { ...progress, unlockedPerks: [...progress.unlockedPerks], discoveredProductIds: [...progress.discoveredProductIds] } : {
    id: regularDef.id,
    friendship: 0,
    unlockedPerks: [],
    discoveredProductIds: [],
    totalVisits: 0,
  };

  currentProg.totalVisits += 1;
  currentProg.lastVisitDay = day;
  return currentProg;
}
