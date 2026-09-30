import type { ProductCategory } from '@game/shared';

/** Một năm game = 120 ngày; sự kiện lặp lại mỗi năm. */
export const SEASON_YEAR_DAYS = 120;
/** Ngày 1 của game rơi vào ngày 22 trong năm để sự kiện đầu tiên (mùa mưa) đến sớm. */
const SEASON_START_OFFSET = 22;

export type SeasonId = 'tet' | 'mua_mua' | 'tuu_truong' | 'trung_thu';

export interface SeasonEvent {
  id: SeasonId;
  name: string;
  blurb: string;
  startDayOfYear: number; // 0-based, bao gồm
  endDayOfYear: number; // bao gồm
  demandMultiplier: number; // nhân tốc độ khách ghé tiệm
  preferredCategories: ProductCategory[]; // khách ưu tiên các nhóm hàng này
  stallMultiplier: Record<string, number>; // nhân sản lượng quầy ăn uống theo id quầy
}

export const SEASON_EVENTS: readonly SeasonEvent[] = [
  { id: 'tet', name: 'Tết Nguyên Đán', blurb: 'Bánh chưng, dưa hấu, câu đối đỏ — bà con sắm Tết rầm rộ.', startDayOfYear: 0, endDayOfYear: 9, demandMultiplier: 1.5, preferredCategories: ['snacks', 'candy', 'soft_drinks', 'cooking_ingredients', 'eggs'], stallMultiplier: { cafe_vot: 1.3, banh_mi_muoi_ot: 0.8 } },
  { id: 'mua_mua', name: 'Mùa mưa Sài Gòn', blurb: 'Mưa chiều bất chợt: mì gói, sữa, đồ gia dụng đắt hàng, ít người ra đường.', startDayOfYear: 30, endDayOfYear: 59, demandMultiplier: 0.85, preferredCategories: ['instant_noodles', 'milk', 'household'], stallMultiplier: { cafe_vot: 1.4, banh_mi_muoi_ot: 1.1 } },
  { id: 'tuu_truong', name: 'Mùa tựu trường', blurb: 'Phụ huynh và học sinh ghé mua đồ ăn sáng, bánh kẹo, sữa.', startDayOfYear: 70, endDayOfYear: 84, demandMultiplier: 1.25, preferredCategories: ['snacks', 'bread', 'milk', 'candy'], stallMultiplier: { cafe_vot: 0.9, banh_mi_muoi_ot: 1.5 } },
  { id: 'trung_thu', name: 'Trung Thu', blurb: 'Rước đèn, phá cỗ: bánh kẹo, sữa bán chạy.', startDayOfYear: 95, endDayOfYear: 104, demandMultiplier: 1.4, preferredCategories: ['candy', 'snacks', 'milk'], stallMultiplier: { cafe_vot: 1.0, banh_mi_muoi_ot: 1.0 } },
];

export function getDayOfYear(day: number): number {
  const index = Math.max(0, Math.floor(day) - 1) + SEASON_START_OFFSET;
  return index % SEASON_YEAR_DAYS;
}

export function getSeasonForDay(day: number): SeasonEvent | null {
  const doy = getDayOfYear(day);
  return SEASON_EVENTS.find(event => doy >= event.startDayOfYear && doy <= event.endDayOfYear) ?? null;
}

/** Số ngày còn lại (kể cả hôm nay) của sự kiện đang diễn ra. */
export function seasonDaysLeft(day: number): number {
  const event = getSeasonForDay(day);
  return event ? event.endDayOfYear - getDayOfYear(day) + 1 : 0;
}
