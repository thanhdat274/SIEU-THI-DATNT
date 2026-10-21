/**
 * style-spec.ts
 * Quy tắc phong cách 3D "pastel đồ chơi" (docs/art-bible/3D-STYLE.md), đứng cạnh `scale-spec.ts` (tỉ lệ).
 * Bảng màu gốc nằm ở `@game/data` (`PALETTE`) để `building-visuals` dùng chung; ở đây là quy tắc vật liệu,
 * hàm kiểm tra màu và màu theo vai trò của nội thất tạp hóa. Màu mới trong renderer phải lấy từ `PALETTE`.
 */
import { PALETTE, GROCERY_STYLE, type PaletteToken } from '@game/data';

export { PALETTE, GROCERY_STYLE, type PaletteToken };

/** Hệ số tự phát sáng cho khối emissive (kính tủ mát, cửa sổ đêm...). */
export const EMISSIVE_SCALE = 0.6;

/** Ngân sách chi tiết: số mục vẽ (mesh hoặc nhóm thin instances) tối đa của một tòa; vượt thì gộp mesh trước khi thêm chi tiết. */
export const DETAIL_BUDGET = { buildingDrawItems: 60 } as const;

/** Ngưỡng "pastel đồ chơi" theo HSV: không bão hòa quá mức; màu có sắc (S > neutralSaturation) không được quá tối. */
export const PASTEL_RULE = { maxSaturation: 0.62, neutralSaturation: 0.2, minValueChromatic: 0.35 } as const;

/** Tương phản tối thiểu (WCAG) cho chữ trên biển hiệu. */
export const SIGN_MIN_CONTRAST = 4.5;

/** Màu nội thất tạp hóa theo vai trò, mỗi vai trò trỏ về một token của bảng màu. */
export const GROCERY_FIXTURE_COLORS = {
  shelfWood: PALETTE.walnut,
  shelfWoodDark: PALETTE.cocoa,
  shelfBackWood: PALETTE.bark,
  shelfMetal: PALETTE.steel,
  shelfMetalDark: PALETTE.steelDark,
  shelfGlass: PALETTE.ice,
  fridgeBody: PALETTE.ice,
  fridgeGlass: PALETTE.sky,
  fridgeTop: PALETTE.steelDark,
  counterBase: PALETTE.walnut,
  counterTop: PALETTE.sand,
  register: PALETTE.charcoal,
} as const;

/** Màu bộ kit chi tiết tòa (kit/) theo vai trò. */
export const KIT_COLORS = {
  frame: PALETTE.bark,
  leaf: PALETTE.walnut,
  glass: PALETTE.sky,
  handle: PALETTE.steelDark,
  trim: PALETTE.white,
  post: PALETTE.sand,
  sill: PALETTE.stone,
} as const;

/** Độ đục của kính trong kit (kính luôn trong suốt cố định, không phản chiếu). */
export const KIT_GLASS_ALPHA = 0.4;

/** Mọi giá trị hex của bảng màu (để kiểm tra "màu này có thuộc bảng màu không"). */
export const PALETTE_HEXES: ReadonlySet<string> = new Set(Object.values(PALETTE));

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Màu không hợp lệ: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Bão hòa và độ sáng theo HSV, cả hai trong 0..1. */
export function hexToSaturationValue(hex: string): { saturation: number; value: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { saturation: max === 0 ? 0 : (max - min) / max, value: max };
}

export function isPastelToy(hex: string): boolean {
  const { saturation, value } = hexToSaturationValue(hex);
  if (saturation > PASTEL_RULE.maxSaturation) return false;
  return saturation <= PASTEL_RULE.neutralSaturation || value >= PASTEL_RULE.minValueChromatic;
}

/** Độ chói tương đối theo WCAG 2. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tỉ lệ tương phản WCAG 2 giữa hai màu (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
