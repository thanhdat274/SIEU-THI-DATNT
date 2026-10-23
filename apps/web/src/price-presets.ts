export interface PriceBounds { min: number; max: number; step: number }

/** Ba mức giá nhanh (OpenSpec `dynamic-economy-simulation` 4.4): hệ số so với giá gợi ý, PROVISIONAL. */
export const PRICE_PRESETS = [
  { id: 'low', label: 'Rẻ −15%', factor: 0.85 },
  { id: 'normal', label: 'Giá gợi ý', factor: 1 },
  { id: 'high', label: 'Cao +15%', factor: 1.15 },
] as const;

/** Giá theo mức: làm tròn theo bước và kẹp trong giới hạn; `null` = về giá gợi ý. */
export function presetPrice(base: number, range: PriceBounds | null, factor: number): number | null {
  if (factor === 1 || !range) return null;
  const stepped = Math.round((base * factor) / range.step) * range.step;
  return Math.min(range.max, Math.max(range.min, stepped));
}

