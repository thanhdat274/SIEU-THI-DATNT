import { miniRand } from '../ui/minigames/seeded';

/**
 * Hệ 7 — trò ⑤ Rót khuôn bánh flan (SPEC-CHIEU-RONG §7.6, "Hội thi làm bánh": rót khuôn theo nhịp).
 * THUẦN, test được. Dịp: Hội thi làm bánh (3–4/12), gắn với `recipe_banh_flan` (mẻ thường 24 cái).
 *
 * Cách chơi: một thanh rót chạy qua lại; chạm khi vạch rót vào đúng vùng xanh của từng khuôn
 * (vị trí vùng xanh mỗi khuôn rút theo seed — hai máy cùng seed ra cùng đề). 6 khuôn.
 * Điểm 0–100 = trung bình điểm các khuôn; rót lệch nhiều thì khuôn đó 0 điểm.
 */
export const FLAN_MOLDS = 6;
/** Nửa bề rộng vùng xanh (trên thang 0..1 của thanh rót). */
export const FLAN_ZONE_HALF = 0.12;
/** Số nhịp (tick) cho thanh chạy hết một chiều 0→1. */
export const FLAN_TICKS_PER_SWEEP = 20;

/** Vị trí vạch rót 0..1 ở nhịp `tick` — sóng tam giác, lặp lại sau 2 chiều. */
export function flanGaugePos(tick: number): number {
  const period = FLAN_TICKS_PER_SWEEP * 2;
  const t = ((tick % period) + period) % period;
  return t <= FLAN_TICKS_PER_SWEEP ? t / FLAN_TICKS_PER_SWEEP : (period - t) / FLAN_TICKS_PER_SWEEP;
}

/** Tâm vùng xanh của khuôn thứ `i` — tất định theo seed, nằm trong [0.2, 0.8] để luôn rót được. */
export function flanZoneCenter(seed: number, i: number): number {
  return 0.2 + miniRand(seed, i, 7) * 0.6;
}

/** Điểm một khuôn 0..1: trong vùng xanh = 1, càng lệch càng giảm, lệch ≥ 2× nửa vùng = 0. */
export function flanMoldScore(pos: number, center: number): number {
  const d = Math.abs(pos - center);
  if (d <= FLAN_ZONE_HALF) return 1;
  return Math.max(0, 1 - (d - FLAN_ZONE_HALF) / FLAN_ZONE_HALF);
}

/** Tổng điểm 0–100 từ danh sách điểm từng khuôn đã rót (khuôn chưa rót tính 0). */
export function scoreFlanKhuon(moldScores: number[]): number {
  const sum = moldScores.slice(0, FLAN_MOLDS).reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0);
  return Math.max(0, Math.min(100, Math.round((sum / FLAN_MOLDS) * 100)));
}
