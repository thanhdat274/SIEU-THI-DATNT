import { fmtNum } from '../core/format';
// GĐ1553 — Thông thạo món bán (tham khảo Xóm B5 "thông thạo giống"): bán một món đủ nhiều lần cả ván
// lên bậc Đồng/Bạc/Vàng. Chỉ báo tin chúc mừng khi vừa lên bậc (không thêm tiền/XP — không đụng kinh tế).
// Đọc từ `soldEver` sẵn có nên không cần trường save mới. Từ cấp 36.

export const SELL_MASTERY_LEVEL = 36;
export const SELL_MASTERY_TIERS = [200, 1000, 4000] as const;
export const SELL_MASTERY_NAMES = ['🥉 Đồng', '🥈 Bạc', '🥇 Vàng'] as const;

/** Bậc thông thạo (0 = chưa, 1..3) theo số món đã bán cả ván. */
export const sellMasteryTier = (count: number): number => SELL_MASTERY_TIERS.filter((t) => count >= t).length;

/** Các món vừa lên bậc giữa hai sổ (trước → sau): [id, bậc mới]. */
export function masteryUps(before: Record<string, number>, after: Record<string, number>): [string, number][] {
  const ups: [string, number][] = [];
  for (const [id, n] of Object.entries(after)) {
    const t = sellMasteryTier(n);
    if (t > sellMasteryTier(before[id] ?? 0)) ups.push([id, t]);
  }
  return ups;
}

/** GĐ1554 — huy hiệu nhỏ ghép vào gợi ý món khi chọn hàng bày kệ (cấp ≥36, đã có bậc). */
export function masteryBadge(level: number, count: number): string {
  const t = sellMasteryTier(count);
  if (level < SELL_MASTERY_LEVEL || t === 0) return '';
  // GĐ1576 — kèm tiến độ tới bậc kế (bậc Vàng thì thôi).
  const next = SELL_MASTERY_TIERS[t];
  return ` · ${SELL_MASTERY_NAMES[t - 1].split(' ')[0]}${next ? ` ${fmtNum(count)}/${fmtNum(next)}` : ''}`;
}

// GĐ1575 — lên bậc thông thạo thưởng chút XP (Đồng 20 / Bạc 60 / Vàng 150). Chỉ XP, không tiền.
export const SELL_MASTERY_XP = [20, 60, 150] as const;
export const masteryXp = (tier: number): number => SELL_MASTERY_XP[tier - 1] ?? 0;

/** GĐ1577 — dòng tổng kết ở Sổ tay Tiệm: số món mỗi bậc thông thạo. */
export function masterySummary(soldEver: Record<string, number>): string | null {
  const n = [0, 0, 0];
  for (const c of Object.values(soldEver)) { const t = sellMasteryTier(c); if (t) n[t - 1]++; }
  if (!n.some(Boolean)) return null;
  return `Thông thạo: ${SELL_MASTERY_NAMES.map((name, i) => `${name.split(' ')[0]} ${n[i]}`).join(' · ')}`;
}
