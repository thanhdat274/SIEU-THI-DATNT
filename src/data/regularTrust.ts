import type { RegularProgress } from './regulars';

// ───── Sổ thương mến (GĐ69) — bể trung thành toàn cửa tiệm, phía bán ─────
// Soi gương supplierRel (GĐ67) bên phía MUA: bể "khách quen đã phục vụ" thấm
// qua các bậc Tiệm quen/thân/ruột/vàng; cuối tháng nhận quà tri ân nếu tháng đó
// có khách quen ghé đủ, gated bằng có ít nhất một "mối ruột" (friendship ≥ ngưỡng).

export const EMOTIONAL_FRIENDSHIP = 40; // thân thiết ≥ đây gọi là "mối ruột" của tiệm

export interface VipTier {
  level: number;
  name: string;
  icon: string;
  /** Tổng lượt khách quen đã phục vụ (cả ván) để đạt bậc này. */
  threshold: number;
  /** đ/lượt khách-quen-gé trong tháng (mỗi lần phục vụ một khách ghé). */
  rate: number;
  /** Trần quà tri ân mỗi tháng. */
  cap: number;
}

export const VIP_TIERS: VipTier[] = [
  { level: 1, name: 'Tiệm quen', icon: '🤝', threshold: 30, rate: 800, cap: 50000 },
  { level: 2, name: 'Tiệm thân', icon: '💛', threshold: 120, rate: 1200, cap: 120000 },
  { level: 3, name: 'Tiệm ruột', icon: '💝', threshold: 300, rate: 1800, cap: 260000 },
  { level: 4, name: 'Tiệm vàng', icon: '🏆', threshold: 600, rate: 2600, cap: 500000 },
];

/** Bể trung thành: tổng lượt khách quen đã phục vụ cả ván (visits tích lũy, không reset). */
export const lifetimeRegularVisits = (regulars: Record<string, RegularProgress>) =>
  Object.values(regulars ?? {}).reduce((n, r) => n + (r.visits ?? 0), 0);

/** Bậc Tiệm hiện tại (level 0 = chưa đạt bậc nào). */
export function vipTierOf(visits: number): VipTier {
  let cur: VipTier = { level: 0, name: 'Tiệm vắng', icon: '🛍️', threshold: 0, rate: 0, cap: 0 };
  for (const t of VIP_TIERS) {
    if (visits >= t.threshold) cur = t;
    else break;
  }
  return cur;
}

/** Bậc kế tiếp (để vẽ thanh tiến tới), null nếu đã max. */
export const nextTierOf = (visits: number): VipTier | null =>
  VIP_TIERS.find((t) => visits < t.threshold) ?? null;

/** Quà tri ân cuối tháng = min(lượt tháng × rate, cap), gated tier ≥ 1 + có mối ruột. */
export function monthlyTriAn(visits: number, monthVisits: number, closeFriends: number) {
  const tier = vipTierOf(visits);
  if (tier.level < 1 || closeFriends < 1) return { tier, amount: 0 };
  return { tier, amount: Math.min(monthVisits * tier.rate, tier.cap) };
}

/**
 * Câu khách quen nói khi mua xong (GĐ402): đã thành "mối ruột" thì gọi đúng tên tiệm người chơi đặt
 * — "khách quen gọi đúng tên mình" trong Tầm nhìn. Chưa đủ thân thì giữ câu riêng của từng khách.
 */
export function satisfiedLine(own: string, prog: RegularProgress | undefined, shopName: string): string {
  if ((prog?.friendship ?? 0) < EMOTIONAL_FRIENDSHIP) return own;
  return `Mua ở ${shopName.trim() || 'tiệm mình'} quen rồi, đi đâu nữa!`;
}
