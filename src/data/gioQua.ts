import { miniRand } from '../ui/minigames/seeded';

/**
 * Hệ 7-L2 — trò ① Xếp giỏ quà (SPEC-CHIEU-RONG §7.5). THUẦN, test được.
 *
 * Một giỏ nhìn từ trên (lưới 4×4) và 6 món quà hình khối khác nhau; xếp cho vừa khít, không chồng,
 * món cao ở sau (lùi), món thấp ở trước. Điểm = số ô lấp đầy + thưởng "đẹp mắt" nếu đúng luật cao–thấp.
 * Đề bài (món quà nào xuất hiện) tất định theo seed (R4).
 */

export const GIO_GRID = 4;

export type GioCell = string | null; // id món quà chiếm ô, hoặc trống

export interface GioGift {
  id: string;
  name: string;
  icon: string;
  /** Kích thước ô chiếm (w × h) khi xếp — món quà xếp thẳng góc, mở rộng về dưới/phải. */
  w: number;
  h: number;
  /** Độ "cao" (1 = thấp, 3 = cao): món cao nên ở phía sau (chỉ số dòng nhỏ hơn). */
  tall: number;
}

/** Bể 8 món quà — mỗi ván rút 6 (tất định theo seed). */
export const GIO_GIFT_POOL: GioGift[] = [
  { id: 'hop_banh_dai', name: 'Hộp bánh dài', icon: '🥮', w: 2, h: 1, tall: 2 },
  { id: 'hu_mut_tron', name: 'Hũ mứt tròn', icon: '🫙', w: 1, h: 1, tall: 3 },
  { id: 'goi_tra_vuong', name: 'Gói trà vuông', icon: '🍵', w: 1, h: 1, tall: 2 },
  { id: 'chai_ruou', name: 'Chai rượu', icon: '🍾', w: 1, h: 2, tall: 3 },
  { id: 'hop_banh_quy', name: 'Hộp bánh quy', icon: '🍪', w: 2, h: 1, tall: 1 },
  { id: 'goi_keo', name: 'Gói kẹo', icon: '🍬', w: 1, h: 1, tall: 1 },
  { id: 'hop_tra_hom', name: 'Hộp trà hộp', icon: '🧋', w: 1, h: 2, tall: 2 },
  { id: 'gia_vi', name: 'Gói gia vị', icon: '🌶️', w: 1, h: 1, tall: 1 },
];

/** Rút đúng 6 món quà xuất hiện trong ván, tất định theo seed + cờ tuần tự. */
export function pickGioGifts(seed: number, salt = 0): GioGift[] {
  const pool = [...GIO_GIFT_POOL];
  const out: GioGift[] = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(miniRand(seed, i, salt + 7) * pool.length));
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export type GioGrid = GioCell[][]; // [row(dòng sau→trước)][col]

export const emptyGioGrid = (): GioGrid =>
  Array.from({ length: GIO_GRID }, () => Array<GioCell>(GIO_GRID).fill(null));

/** Món quà có vừa khít tại (row, col) (góc trên-trái) trong giỏ không — không chồng, không tràn. */
export function gioCanPlace(grid: GioGrid, gift: GioGift, row: number, col: number): boolean {
  if (row < 0 || col < 0 || row + gift.h > GIO_GRID || col + gift.w > GIO_GRID) return false;
  for (let r = row; r < row + gift.h; r++) {
    for (let c = col; c < col + gift.w; c++) {
      if (grid[r][c] !== null) return false;
    }
  }
  return true;
}

/** Đặt món quà vào giỏ (đã kiểm gioCanPlace). */
export function gioPlace(grid: GioGrid, gift: GioGift, row: number, col: number): GioGrid {
  const g = grid.map((r) => [...r]);
  for (let r = row; r < row + gift.h; r++) {
    for (let c = col; c < col + gift.w; c++) g[r][c] = gift.id;
  }
  return g;
}

export interface GioPlacement { gift: GioGift; row: number; col: number }

/** Mọi ô vị trí (row,col) có thể đặt món quà này trong giỏ hiện tại. */
export function gioFreeSpots(grid: GioGrid, gift: GioGift): { row: number; col: number }[] {
  const spots: { row: number; col: number }[] = [];
  for (let row = 0; row <= GIO_GRID - gift.h; row++) {
    for (let col = 0; col <= GIO_GRID - gift.w; col++) {
      if (gioCanPlace(grid, gift, row, col)) spots.push({ row, col });
    }
  }
  return spots;
}

/**
 * Điểm 0–100: ô lấp đầy (≤70) + thưởng trật tự cao–thấp (≤30).
 * Dòng 0 = sau, dòng 3 = trước: món càng cao thì chỉ số dòng càng nhỏ cho điểm hơn.
 */
export function scoreGioQua(placements: GioPlacement[]): number {
  let filled = 0;
  let orderScore = 0;
  let orderMax = 0;
  for (const p of placements) {
    filled += p.gift.w * p.gift.h;
    // thưởng trật tự: món có `tall` giảm dần theo dòng (sau→trước). Cao hơn → dòng nhỏ hơn.
    orderMax += (GIO_GRID - 1) * p.gift.tall;
    orderScore += (GIO_GRID - 1 - p.row) * p.gift.tall;
  }
  const fillPct = Math.min(1, filled / (GIO_GRID * GIO_GRID));
  const orderPct = orderMax > 0 ? orderScore / orderMax : 0;
  return Math.round(fillPct * 70 + orderPct * 30);
}
