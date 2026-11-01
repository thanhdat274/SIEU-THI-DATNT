import type { SeasonKey } from './seasonEvent';

/** GĐ83 — "📖 Sổ Mùa: Niên giám 4 mùa dài hạn".
 *  Sao mùa (sự kiện GĐ75) hiện chỉ gom THEO NĂM rồi vứt khi sang năm (`year.seasonStars` reset trong
 *  `closeYear`). Sổ Mùa tích lũy NAM SAO MỌI MÙA qua TẤT CẢ năm — bộ sưu tập dài hạn theo nhịp mùa +
 *  mồi "quay lại đúng mùa" + mốc thưởng đa-năm. Thuần đọc: không import store, không đổi kinh tế. */

export const ALMANAC_SEASONS: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];

/** Mốc thưởng theo TỔNG sao mọi mùa (đời). */
export const ALMANAC_MILESTONES = [15, 30, 50];

/** Thưởng phụ gia khi chạm mốc (additive, không đổi công thức nền). */
export const almanacMilestoneReward = (at: number, level: number) =>
  Math.round((150000 + level * 5000 + at * 2000) / 1000) * 1000;

/** Đọc niên giám: số sao từng mùa + tổng + mùa yêu thích + số mùa đã chạm. */
export function readAlmanac(almanac: Partial<Record<SeasonKey, number>> | undefined): {
  perSeason: Record<SeasonKey, number>;
  total: number;
  favorite: SeasonKey | null;
  seasonsTouched: number;
} {
  const perSeason = {} as Record<SeasonKey, number>;
  let total = 0;
  for (const s of ALMANAC_SEASONS) perSeason[s] = (almanac?.[s] ?? 0) || 0;
  for (const s of ALMANAC_SEASONS) total += perSeason[s];
  let favorite: SeasonKey | null = null;
  let favStars = 0;
  for (const s of ALMANAC_SEASONS) if (perSeason[s] > favStars) { favorite = s; favStars = perSeason[s]; }
  const seasonsTouched = ALMANAC_SEASONS.filter((s) => perSeason[s] > 0).length;
  return { perSeason, total, favorite: favorite && favStars > 0 ? favorite : null, seasonsTouched };
}

/** Mốc KẾ TIẾP chưa đủ (chưa đạt) — cho UI "còn bao nhiêu sao" (remaining). Null khi đã qua mốc cuối. */
export function nextAlmanacMilestone(total: number, claimed: number[]): { at: number; remaining: number } | null {
  for (const at of ALMANAC_MILESTONES) {
    if (total < at && !claimed.includes(at)) return { at, remaining: at - total };
  }
  return null;
}

/** Các mốc vừa ĐỦ sao nhưng chưa nhận thưởng (để bizEndOfDay trả 1 lần/ngày). */
export function newlyReachedAlmanac(total: number, claimed: number[]): number[] {
  return ALMANAC_MILESTONES.filter((at) => total >= at && !claimed.includes(at));
}
