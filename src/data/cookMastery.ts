// GĐ1522 — Thông thạo món (mục C#10 TONG-HOP Xóm: "thông thạo = hạng theo số mẻ đã làm của 1 món, −5% chờ").
// Mỗi mẻ bắt đầu nấu +1 cho công thức đó; đủ mốc thì mẻ sau nấu nhanh hơn. Mở từ cấp 31 (sau golden 30).
export const MASTERY_UNLOCK = 31;
/** [số mẻ, phần giảm thời gian nấu] */
export const MASTERY_TIERS: readonly [number, number][] = [[20, 0.05], [50, 0.1], [100, 0.15]];
export const MASTERY_NAMES = ['', '🥉 Quen tay', '🥈 Lành nghề', '🥇 Thông thạo'] as const;

export function masteryTier(batches: number): number {
  let t = 0;
  MASTERY_TIERS.forEach(([n], i) => { if (batches >= n) t = i + 1; });
  return t;
}
export function masteryCut(batches: number, level: number): number {
  if (level < MASTERY_UNLOCK) return 0;
  const t = masteryTier(batches);
  return t ? MASTERY_TIERS[t - 1][1] : 0;
}
/** Thời gian nấu (phút) sau thông thạo, tối thiểu 1 phút. */
export function masteredDuration(baseMin: number, batches: number, level: number): number {
  return Math.max(1, Math.round(baseMin * (1 - masteryCut(batches, level))));
}
/** Còn bao nhiêu mẻ tới mốc kế (null = đã tối đa). */
export function batchesToNext(batches: number): number | null {
  const next = MASTERY_TIERS.find(([n]) => batches < n);
  return next ? next[0] - batches : null;
}
