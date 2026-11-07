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
