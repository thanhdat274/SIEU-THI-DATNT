import { miniPick } from '../ui/minigames/seeded';

/**
 * Hệ 7 — trò ⑥ Pha nước theo đơn (SPEC-CHIEU-RONG §7.6, Mùa hè: "pha nước theo đơn, ghi nhớ thứ tự").
 * THUẦN, test được. Dịp: Mùa hè (`he`), gắn với `recipe_vai_da_xay` (mẻ thường 8 ly).
 *
 * Cách chơi: mỗi vòng quầy hiện một đơn nước (thứ tự các nguyên liệu) vài giây rồi ẩn; người chơi
 * bấm lại đúng thứ tự. 3 vòng, đơn dài dần 3 → 4 → 5 món. Điểm 0–100 = trung bình tỉ lệ đúng vị trí.
 * Đề tất định theo seed (R4).
 */
export interface PhaIngredient { id: string; name: string; icon: string }

export const PHA_INGREDIENTS: PhaIngredient[] = [
  { id: 'da', name: 'Đá', icon: '🧊' },
  { id: 'duong', name: 'Đường', icon: '🍬' },
  { id: 'vai', name: 'Vải', icon: '🍒' },
  { id: 'sua', name: 'Sữa', icon: '🥛' },
  { id: 'tra', name: 'Trà', icon: '🍵' },
  { id: 'chanh', name: 'Chanh', icon: '🍋' },
];

export const PHA_ROUNDS = 3;
/** Độ dài đơn của vòng `r` (0-based): 3, 4, 5. */
export const phaLength = (r: number): number => 3 + r;
/** Số giây hiện đơn trước khi ẩn (mức Nhanh tay; Thong thả hiện lâu hơn). */
export const PHA_SHOW_MS = { fast: 2500, calm: 5000 } as const;

/** Đơn nước (thứ tự id nguyên liệu) của vòng `r` — tất định theo seed, không lặp liên tiếp hai lần cùng món. */
export function phaOrder(seed: number, r: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < phaLength(r); i++) {
    let pick = miniPick(seed, r * 10 + i, 3, PHA_INGREDIENTS).id;
    if (i > 0 && pick === out[i - 1]) {
      const idx = PHA_INGREDIENTS.findIndex((x) => x.id === pick);
      pick = PHA_INGREDIENTS[(idx + 1) % PHA_INGREDIENTS.length].id;
    }
    out.push(pick);
  }
  return out;
}

/** Tỉ lệ 0..1 các vị trí bấm đúng so với đơn (thiếu = sai). */
export function phaRoundScore(order: string[], input: string[]): number {
  if (order.length === 0) return 0;
  let ok = 0;
  for (let i = 0; i < order.length; i++) if (input[i] === order[i]) ok++;
  return ok / order.length;
}

/** Tổng điểm 0–100 từ điểm các vòng (vòng chưa chơi tính 0). */
export function scorePhaNuoc(roundScores: number[]): number {
  const sum = roundScores.slice(0, PHA_ROUNDS).reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0);
  return Math.max(0, Math.min(100, Math.round((sum / PHA_ROUNDS) * 100)));
}
