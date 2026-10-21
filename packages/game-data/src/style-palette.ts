/**
 * Bảng màu gốc của phong cách 3D "pastel đồ chơi" (docs/art-bible/3D-STYLE.md).
 * Dữ liệu thuần để cả `building-visuals` (game-data) lẫn renderer 3D dùng chung; quy tắc vật liệu và kiểm tra
 * nằm ở `packages/game-renderer-3d/src/style-spec.ts`. Màu mới trong renderer phải lấy từ đây, không gõ hex.
 */
export const PALETTE = {
  // Trung tính ấm
  white: '#fbf6ea',
  cream: '#f6ead2',
  butter: '#f4dc9a',
  sand: '#e6cfa3',
  stone: '#cbc5b6',
  slate: '#5f6b77',
  charcoal: '#3a4048',
  // Gỗ
  oak: '#c99d6a',
  walnut: '#94704c',
  bark: '#74543b',
  cocoa: '#5e4632',
  // Kim loại và kính
  steel: '#b3bec5',
  steelDark: '#7f8c95',
  ice: '#dfeaf0',
  sky: '#a9d6ec',
  // Màu nhấn
  tomato: '#e47467',
  terracotta: '#d9795f',
  peach: '#f3c5a9',
  mint: '#a9dcbc',
  leaf: '#72b07e',
  forest: '#3f7a54',
  sun: '#f2c168',
} as const;

export type PaletteToken = keyof typeof PALETTE;

/** Vai trò màu của tòa Tiệm Tạp Hóa (`grocery_main`), tham chiếu token của bảng màu. */
export const GROCERY_STYLE = {
  wall: PALETTE.cream,
  roof: PALETTE.terracotta,
  /** Mái hiên: hai màu sọc xen kẽ. */
  awning: [PALETTE.tomato, PALETTE.white] as const,
  signBg: PALETTE.forest,
  signText: PALETTE.white,
} as const;
