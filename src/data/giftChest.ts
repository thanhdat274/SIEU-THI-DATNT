import type { DailyGift } from './gifts';

/** GĐ1533 — Xóm #11 "rương trọng số": từ cấp 34, rương vàng ngày 7 mở ra 1 trong 6 bậc
 *  theo tỉ lệ 30/20/20/15/10/5%, nhân tiền ×0,6/0,8/1/1,5/2/3 (kỳ vọng ≈×1,12). Tất định theo ngày
 *  (băm số ngày, không RNG) → solo = co-op. Dưới cấp 34 rương y cũ (golden không đổi). */
export const CHEST_UNLOCK = 34;
export const CHEST_TIERS: readonly { pct: number; mul: number; name: string }[] = [
  { pct: 30, mul: 0.6, name: 'Rương gỗ' },
  { pct: 20, mul: 0.8, name: 'Rương tre' },
  { pct: 20, mul: 1, name: 'Rương đồng' },
  { pct: 15, mul: 1.5, name: 'Rương bạc' },
  { pct: 10, mul: 2, name: 'Rương vàng' },
  { pct: 5, mul: 3, name: 'Rương ngọc' },
];

/** Số 0–99 tất định theo ngày. */
export const chestRoll = (day: number) => (Math.imul(day + 0x9e37, 2654435761) >>> 0) % 100;

export function chestTier(day: number) {
  let r = chestRoll(day);
  for (const t of CHEST_TIERS) { if (r < t.pct) return t; r -= t.pct; }
  return CHEST_TIERS[CHEST_TIERS.length - 1];
}

/** Áp bậc rương lên quà ngày 7 (đã scale). Không phải ngày rương / chưa đủ cấp thì trả nguyên. */
export function applyChest(gift: DailyGift, streak: number, level: number, day: number): DailyGift {
  if (level < CHEST_UNLOCK || streak % 7 !== 0 || gift.money === undefined) return gift;
  const t = chestTier(day);
  return { ...gift, label: t.name, money: Math.round((gift.money * t.mul) / 1000) * 1000 };
}
