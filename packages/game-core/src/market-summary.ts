import {
  CLIMATE_SEASON_MAP, TIME_BANDS, WEATHER_MAP, WEEKDAY_LABELS,
  getLevelTrafficMultiplier, getSeasonForDay, prestigeTrafficMultiplier,
} from '@game/data';
import type { MarketState } from '@game/shared';
import type { DemandTable } from './demand';
import { effectiveWeatherId, timeBandFor, visibleMarketEvents, weekdayOf } from './market';
import { trafficAtLevel } from './progression';
import { reputationTrafficMultiplier } from './reputation';
import { climateSeasonForDay, rainForecastForDay, rainIntensityAt } from './weather';

/** Đầu vào tường minh cho tóm tắt thị trường (tách khỏi `GameSimulation`, không đọc trạng thái ngầm). */
export interface MarketSummaryContext {
  market: MarketState;
  weatherSeed: string;
  time: { day: number; hour: number; minute: number };
  table: DemandTable;
  ratings: readonly number[] | undefined;
  level: number;
  prestigeStars: number;
  decor: { points: number; trafficMultiplier: number };
}

/** Tóm tắt cho giao diện: thời tiết hôm nay + dự báo, mùa, khung giờ, thứ, lưu lượng và lý do. */
export function buildMarketSummary(ctx: MarketSummaryContext) {
  const { market, weatherSeed, time, table, ratings, level, prestigeStars, decor } = ctx;
  const todayId = effectiveWeatherId(market, time.day);
  const weather = WEATHER_MAP[todayId] ?? WEATHER_MAP[market.weather.today];
  const ratingMultiplier = reputationTrafficMultiplier(ratings);
  const levelMultiplier = getLevelTrafficMultiplier(level);
  return {
    weather: {
      id: weather.id, label: weather.label, icon: weather.icon,
      rainIntensity: rainIntensityAt(weatherSeed, time.day, time.hour, time.minute, weather.id),
      rain: rainForecastForDay(weatherSeed, time.day, weather.id),
    },
    forecast: [1, 2].map(offset => {
      const id = effectiveWeatherId(market, time.day + offset);
      return { id, label: WEATHER_MAP[id]?.label ?? id, icon: WEATHER_MAP[id]?.icon ?? '', rain: rainForecastForDay(weatherSeed, time.day + offset, id) };
    }),
    events: visibleMarketEvents(market, time.day),
    season: getSeasonForDay(time.day),
    climate: CLIMATE_SEASON_MAP[climateSeasonForDay(time.day).id],
    timeBand: TIME_BANDS.find(band => band.id === timeBandFor(time.hour))!,
    weekday: WEEKDAY_LABELS[weekdayOf(time.day)],
    traffic: {
      ...table.traffic,
      value: trafficAtLevel(table.traffic.value * ratingMultiplier * decor.trafficMultiplier * prestigeTrafficMultiplier(prestigeStars), level),
      factors: [
        ...table.traffic.factors,
        { ruleId: 'customer_ratings', label: 'Đánh giá khách', factor: ratingMultiplier },
        ...(decor.points > 0 ? [{ ruleId: 'decor_attraction', label: 'Trang trí cửa hàng', factor: decor.trafficMultiplier }] : []),
        ...(levelMultiplier > 1 ? [{ ruleId: 'level_progression_traffic', label: `Cấp ${level}: lưu lượng khách tăng`, factor: levelMultiplier }] : []),
      ],
    },
  };
}
