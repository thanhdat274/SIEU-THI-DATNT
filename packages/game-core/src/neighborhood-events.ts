import {
  SEASON_EVENTS,
  SEASON_YEAR_DAYS,
  getDayOfYear,
  getSeasonWindow,
  getSeasonYear,
} from '@game/data';

export interface UpcomingSeasonEvent {
  eventId: string;
  name: string;
  blurb: string;
  daysUntil: number; // 0 = đang diễn ra hôm nay
  demandMultiplier: number;
}

/**
 * Liệt kê lễ hội đang diễn ra (daysUntil 0) và các lễ hội sắp tới trong năm game,
 * mới nhất trước. Thuần và xác định theo `day`.
 */
export function upcomingNearbySeasons(day: number, horizonDays = 365): UpcomingSeasonEvent[] {
  const result: UpcomingSeasonEvent[] = [];
  const current = getSeasonWindow(day);
  if (current) {
    result.push({
      eventId: current.event.id,
      name: current.event.name,
      blurb: current.event.blurb,
      daysUntil: 0,
      demandMultiplier: current.event.demandMultiplier,
    });
  }

  const doy = getDayOfYear(day);
  for (const ev of SEASON_EVENTS) {
    const startDoy = ev.startDayOfYear;
    const startGameDay = startDoy > doy
      ? day + (startDoy - doy)
      : day + (SEASON_YEAR_DAYS - doy + startDoy);
    const until = startGameDay - day;
    if (until > 0 && until <= horizonDays) {
      result.push({
        eventId: ev.id,
        name: ev.name,
        blurb: ev.blurb,
        daysUntil: until,
        demandMultiplier: ev.demandMultiplier,
      });
    }
  }

  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Số ngày còn lại (kể cả hôm nay) của lễ hội đang diễn ra, hoặc 0 khi không có. */
export function daysLeftInSeason(day: number): number {
  const w = getSeasonWindow(day);
  if (!w) return 0;
  return w.lastDay - day + 1;
}

/** Năm mùa hiện tại (dùng làm khóa chống nhắc lặp lễ hội). */
export function seasonYearOf(day: number): number {
  return getSeasonYear(day);
}
