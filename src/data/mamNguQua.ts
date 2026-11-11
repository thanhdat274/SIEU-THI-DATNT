import { miniRand } from '../ui/minigames/seeded';

/**
 * Hệ 7-L4 — trò ③ Bày mâm ngũ quả (SPEC-CHIEU-RONG §7.5). THUẦN, test được.
 *
 * Hai kiểu đề theo seed: mâm miền Bắc (chuối, bưởi, đào, hồng, quýt) hoặc mâm miền Nam
 * ("cầu dừa đủ xài" — mãng cầu, dừa, đu đủ, xoài, sung). Người chơi phải chọn đúng 5 loại
 * của kiểu đó trong số 8 loại bày ra, rồi xếp cân: quả to làm đế, quả nhỏ chèn quanh.
 * Điểm = 70 (chọn đúng 5 loại) + 30 (xếp quả to xuống hàng đế). Đề tất định theo seed (R4).
 */
export interface MamFruit {
  id: string;
  name: string;
  icon: string;
  /** Quả "to" làm đế (đặt ở hàng đế dưới); quả nhỏ chèn quanh. */
  big: boolean;
}

/** Mâm miền Bắc — chuối, bưởi, đào, hồng, quýt. */
export const MAM_BAC: MamFruit[] = [
  { id: 'chuoi', name: 'Chuối', icon: '🍌', big: true },
  { id: 'buoi', name: 'Bưởi', icon: '🍈', big: true },
  { id: 'dao', name: 'Đào', icon: '🍑', big: false },
  { id: 'hong', name: 'Hồng', icon: '🍅', big: false },
  { id: 'quyt', name: 'Quýt', icon: '🍊', big: false },
];

/** Mâm miền Nam — mãng cầu, dừa, đu đủ, xoài, sung ("cầu dừa đủ xài"). */
export const MAM_NAM: MamFruit[] = [
  { id: 'mang_cau', name: 'Mãng cầu', icon: '🍏', big: true },
  { id: 'dua', name: 'Dừa', icon: '🥥', big: true },
  { id: 'du_du', name: 'Đu đủ', icon: '🥭', big: true },
  { id: 'xoai', name: 'Xoài', icon: '🍋', big: false },
  { id: 'sung', name: 'Sung', icon: '🫒', big: false },
];

/** Toàn bể quả (cho kiểm tra tra cứu). */
export const MAM_ALL: MamFruit[] = [...MAM_BAC, ...MAM_NAM];

export const mamFruitById = (id: string): MamFruit | undefined => MAM_ALL.find((f) => f.id === id);

/** Quả này có "to" (nên làm đế) không. */
export const mamFruitBig = (id: string): boolean => mamFruitById(id)?.big ?? false;

export const MAM_CORRECT_COUNT = 5;
export const MAM_DECOY_COUNT = 3;

export type MamRegion = 'bac' | 'nam';

export interface MamDeck {
  region: MamRegion;
  /** 5 loại quả đúng của vùng. */
  correct: string[];
  /** 8 loại bày ra màn: 5 đúng + 3 mồi (lấy từ vùng kia), đã xáo thứ tự tất định. */
  shown: MamFruit[];
}

/** Xáo mảng tất định theo seed + salt tuần tự (dùng riêng cho ổn định đề bài). */
function shuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(miniRand(seed, i, 77) * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Rút đề bài cho một ván — tất định theo seed: chọn vùng (Bắc/Nam), 3 mồi từ vùng kia,
 * rồi xáo thứ tự 8 loại hiển thị.
 */
export function pickMamDeck(seed: number): MamDeck {
  const nam = miniRand(seed, 0, 1) < 0.5;
  const correctArr = nam ? MAM_NAM : MAM_BAC;
  const other = nam ? MAM_BAC : MAM_NAM;

  const pool = [...other];
  const decoys: MamFruit[] = [];
  for (let i = 0; i < MAM_DECOY_COUNT; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(miniRand(seed, i, 5) * pool.length));
    decoys.push(pool.splice(idx, 1)[0]);
  }

  const shown = shuffle([...correctArr, ...decoys], seed);
  return { region: nam ? 'nam' : 'bac', correct: correctArr.map((f) => f.id), shown };
}

/** Vùng này là Bắc hay Nam (để hiện chú thích văn hoá). */
export const mamRegionName = (r: MamRegion): string => (r === 'bac' ? 'Mâm miền Bắc' : 'Mâm miền Nam');

/**
 * Điểm chọn đúng 5 loại — 70/100. Mỗi loại đúng thiếu −14, mỗi loại sai đã chọn −10.
 * Chọn đúng cả 5, không chọn nhầm → 70.
 */
export function scoreMamChoice(selected: string[], correct: string[]): number {
  const chosen = new Set(selected);
  const correctSel = correct.filter((id) => chosen.has(id)).length;
  const wrong = selected.length - correctSel;
  const raw = 70 - (MAM_CORRECT_COUNT - correctSel) * 14 - wrong * 10;
  return Math.max(0, Math.min(70, raw));
}

/** Mỗi quả người chơi đã đặt lên mâm: quả gì, có ở hàng đế không. */
export interface MamPlace {
  fruitId: string;
  /** true = đặt ở hàng đế (dưới), false = đặt ở hàng trên. */
  base: boolean;
}

/**
 * Điểm xếp cân — 30/100 = tỉ lệ quả TO nằm ở hàng đế. Quả nhỏ ở đâu cũng được (không phạt).
 * Chưa đặt quả to nào → 0.
 */
export function scoreMamArrange(placements: MamPlace[]): number {
  const bigs = placements.filter((p) => mamFruitBig(p.fruitId));
  if (bigs.length === 0) return 0;
  const onBase = bigs.filter((p) => p.base).length;
  return Math.round((onBase / bigs.length) * 30);
}

/** Tổng điểm 0–100 = chọn đúng 70 + xếp cân 30. Kẹp an toàn. */
export function scoreMamNguQua(selected: string[], correct: string[], placements: MamPlace[]): number {
  return Math.max(0, Math.min(100, scoreMamChoice(selected, correct) + scoreMamArrange(placements)));
}
