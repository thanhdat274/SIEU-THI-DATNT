import type { DayStats } from '../core/gameTypes';
import { YEAR_DAYS } from './calendar';

// ───── Sự kiện thử thách theo mùa (GĐ75) ─────
// Mọi cadence (ngày/tuần/tháng/mùa-lễ) đã có nhưng đều là "counter"; chưa có "đợt burst" ngắn hạn
// tạo cú hích quay lại TẬP TRUNG. Giai đoạn này thêm mini-event 5 ngày, mỗi MÙA một đợt (4 lần/năm),
// mỗi ngày 1 mục tiêu đa-hệ (online/farm/nấu/combo/dịch vụ/khách) — đẩy người chơi chạm hệ ít dùng.
// Hoàn mục tiêu ngày → +sao + thưởng nhỏ (additive qua `money`, ledger-stable). Lịch xác định theo
// seed/day (không server/co-op). Thuần đọc: không import store, không đụng kinh tế hằng ngày.

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASON_EVENT_DAYS = 5;
export const SEASON_REWARD_PER_STAR = 25_000;

export interface SeasonObjective {
  icon: string;
  title: string;
  detail: string;
  panel: string;
  /** Đo được ngày này (stats) — chỉ dùng trường DayStats có sẵn. */
  measure: (s: DayStats) => boolean;
}

export const SEASON_OBJECTIVES: SeasonObjective[] = [
  { icon: '🛵', title: 'Giao đơn app', detail: 'bán 3 đơn online', panel: 'online', measure: (s) => (s.onlineDone ?? 0) >= 3 },
  { icon: '🌾', title: 'Thu hoạch trại', detail: 'thu 8 nông sản', panel: 'garden', measure: (s) => (s.farmHarvest ?? 0) >= 8 },
  { icon: '🍲', title: 'Bán món nhà làm', detail: 'giao 4 đơn nấu', panel: 'cook', measure: (s) => (s.cookOrders ?? 0) >= 4 },
  { icon: '🎁', title: 'Bán combo', detail: '3 combo đi kèm', panel: 'combos', measure: (s) => (s.combos ?? 0) >= 3 },
  { icon: '💳', title: 'Thu dịch vụ', detail: '50.000đ lời dịch vụ', panel: 'services', measure: (s) => (s.services ?? 0) >= 50_000 },
  { icon: '⭐', title: 'Nhiều lời khen', detail: '3 đánh giá 5★', panel: 'business', measure: (s) => (s.fiveStars ?? 0) >= 3 },
];

/** Mùa theo ngày trong năm (không cắt qua năm — cửa sổ mùa đông nằm gọn tháng 12 để không wrap). */
export function seasonOf(day: number): SeasonKey {
  const d = ((day - 1) % YEAR_DAYS + YEAR_DAYS) % YEAR_DAYS;
  if (d >= 151 && d <= 242) return 'summer';
  if (d >= 243 && d <= 333) return 'autumn';
  if (d >= 334) return 'winter';
  if (d <= 58) return 'winter';
  return 'spring';
}

/** Cửa sổ sự kiện mùa: 5 ngày giữa mùa (xác định, không cắt năm). */
export function seasonWindow(season: SeasonKey): { start: number; end: number } {
  const R: Record<SeasonKey, [number, number]> = {
    spring: [59, 150], summer: [151, 242], autumn: [243, 333], winter: [334, 365],
  };
  const [a, b] = R[season];
  const mid = a + Math.floor((b - a) / 2);
  const start = mid - Math.floor(SEASON_EVENT_DAYS / 2);
  return { start, end: start + SEASON_EVENT_DAYS - 1 };
}

/** Sự kiện hôm nay: `{ season, dayIndex 0..4 }` nếu đang trong cửa sổ mùa, ngược lại null. */
export function seasonEvent(day: number): { season: SeasonKey; dayIndex: number } | null {
  const season = seasonOf(day);
  const d = ((day - 1) % YEAR_DAYS + YEAR_DAYS) % YEAR_DAYS;
  const { start, end } = seasonWindow(season);
  if (d < start || d > end) return null;
  return { season, dayIndex: d - start };
}

/** Hash seed=day, salt — xác định (giống events.ts). */
function roll(seed: number, n: number, salt: number): number {
  let h = Math.imul((seed >>> 0) ^ Math.imul(n, 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Mục tiêu ngày hôm nay của sự kiện (xoay theo seed/day — xác định). */
export function seasonObjective(seed: number, day: number): SeasonObjective | null {
  const ev = seasonEvent(day);
  if (!ev) return null;
  const idx = Math.floor(roll(seed, day, 231) * SEASON_OBJECTIVES.length);
  return SEASON_OBJECTIVES[idx];
}

export const seasonEventName = (season: SeasonKey): string =>
  ({ spring: 'Lễ hội Xuân', summer: 'Hè rực nắng', autumn: 'Chợ Thu', winter: 'Chợ Tết sớm' })[season];
