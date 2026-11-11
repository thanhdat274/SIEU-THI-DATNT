import { miniRand } from '../ui/minigames/seeded';

/**
 * Hệ 7-L3 — trò ② Gói bánh chưng (SPEC-CHIEU-RONG §7.5). THUẦN, test được.
 *
 * Khuôn vuông giữa màn, nguyên liệu dưới. Làm đúng trình tự thật: lót lá dong → nếp → đậu xanh →
 * thịt → đậu xanh → nếp → gấp lá → buộc lạt. Sai thứ tự thì cái bánh đó bị "méo". Gói 4 cái trong 45s.
 * Điểm = số bánh vuông vức. Đề (nguyên liệu thừa đưa vào khay) tất định theo seed (R4).
 */

/** Các loại thao tác xếp vào bánh (gấp lá / buộc lạt là động tác, không phải nguyên liệu). */
export interface BanhIngredient {
  id: string;
  name: string;
  icon: string;
}

/** Khay cơ bản: 6 loại theo đúng thứ tự gói. */
export const BANH_INGREDIENTS: BanhIngredient[] = [
  { id: 'la_dong', name: 'Lá dong', icon: '🍃' },
  { id: 'nep', name: 'Nếp', icon: '🌾' },
  { id: 'dau_xanh', name: 'Đậu xanh', icon: '🫛' },
  { id: 'thit_ba_chi', name: 'Thịt ba chỉ', icon: '🥩' },
  { id: 'gan_la', name: 'Gấp lá', icon: '🔻' },
  { id: 'buoc_lat', name: 'Buộc lạt', icon: '🎗️' },
];

export const banhIngredientById = (id: string): BanhIngredient | undefined =>
  BANH_INGREDIENTS.find((x) => x.id === id);

/** Trình tự chuẩn của MỘT cái bánh — 8 bước, hai lần nếp và hai lần đậu xanh (nếp→đậu→thịt→đậu→nếp). */
export const BANH_CHUNG_STEPS: string[] = [
  'la_dong', 'nep', 'dau_xanh', 'thit_ba_chi', 'dau_xanh', 'nep', 'gan_la', 'buoc_lat',
];

/** Một cái bánh là "vuông vức" khi chuỗi bước đã gõ khớp hệt trình tự chuẩn. */
export function isSquareBanh(sequence: string[]): boolean {
  if (sequence.length !== BANH_CHUNG_STEPS.length) return false;
  return BANH_CHUNG_STEPS.every((s, i) => sequence[i] === s);
}

/** Nguyên liệu thừa (mồi) đưa vào khay để bấm nhầm — rút tất định theo seed + số cái bánh. */
export const BANH_DECOR_POOL: BanhIngredient[] = [
  { id: 'gia_vi', name: 'Gia vị', icon: '🧂' },
  { id: 'hanh_kho', name: 'Hành khô', icon: '🧅' },
  { id: 'hat_tieu', name: 'Hạt tiêu', icon: '⚫' },
  { id: 'mi_chinh', name: 'Mì chính', icon: '🫙' },
  { id: 'ot_qua', name: 'Ớt quả', icon: '🌶️' },
];

/** Rút `count` mồi cho cái bánh `cake` — tất định theo seed + salt. */
export function pickBanhDecors(seed: number, cake: number, count = 2): BanhIngredient[] {
  const pool = [...BANH_DECOR_POOL];
  const out: BanhIngredient[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(miniRand(seed, cake, i + 11) * pool.length));
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** Khay đầy đủ cho một cái bánh: 6 loại chuẩn + mồi. */
export function banhTray(seed: number, cake: number, decor = 2): BanhIngredient[] {
  const picked = pickBanhDecors(seed, cake, decor);
  return [...BANH_INGREDIENTS, ...picked];
}

/** Điểm 0–100 = tỉ lệ bánh vuông vức (spec: gói 4 cái). Kẹp an toàn. */
export function scoreBanhChung(squareCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((squareCount / total) * 100)));
}
