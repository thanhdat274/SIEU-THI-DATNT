/** GĐ1529 — Xóm #12 "+N EXP minh bạch": số XP vừa nhận (tổng XP hôm nay tăng bao nhiêu).
 *  Sang ngày mới tổng reset về 0 → không hiện số âm. */
export const xpGainDelta = (prev: number, next: number): number => (next > prev ? next - prev : 0);
