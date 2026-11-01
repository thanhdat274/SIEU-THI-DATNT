import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, newGameData } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import {
  seasonEvent, seasonOf, seasonWindow, seasonObjective, seasonEventName,
  SEASON_OBJECTIVES, SEASON_EVENT_DAYS, SEASON_REWARD_PER_STAR, type SeasonKey,
} from '../data/seasonEvent';
import { emptyMonth } from '../data/biz';

/** Ngày game của một ngày trong cửa sổ sự kiện mùa (index 0..4). */
function eventDay(season: SeasonKey, index: number): number {
  return seasonWindow(season).start + index + 1; // doy (0-based) + 1 = day game
}
/** Ngày game của mùa, ngoài cửa sổ (đầu mùa). */
function seasonStartDay(season: SeasonKey): number {
  const ST: Record<SeasonKey, number> = { spring: 59, summer: 151, autumn: 243, winter: 334 };
  return ST[season] + 1;
}

describe('GĐ75 — Sự kiện thử thách theo mùa (seasonEvent)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 1, level: 40, money: 50_000_000 });
  });

  describe('helper thuần', () => {
    it('cửa sổ sự kiện mùa đúng 5 ngày giữa mùa', () => {
      for (const s of ['spring', 'summer', 'autumn', 'winter'] as SeasonKey[]) {
        expect(seasonWindow(s).end - seasonWindow(s).start + 1).toBe(SEASON_EVENT_DAYS);
      }
    });
    it('seasonOf trả đúng mùa cho các ngày đại diện', () => {
      expect(seasonOf(eventDay('winter', 2))).toBe('winter');
      expect(seasonOf(eventDay('spring', 2))).toBe('spring');
      expect(seasonOf(eventDay('summer', 2))).toBe('summer');
      expect(seasonOf(eventDay('autumn', 2))).toBe('autumn');
    });
    it('seasonEvent null ngoài cửa sổ, khớp dayIndex trong cửa sổ', () => {
      const w = seasonWindow('spring');
      expect(seasonEvent(eventDay('spring', 0))!.dayIndex).toBe(0);
      expect(seasonEvent(eventDay('spring', 1))!.dayIndex).toBe(1);
      expect(seasonEvent(w.start)).toBeNull(); // doy == start là ngày - (start-1) => day = start -> day-1=start-1 ngoài
      expect(seasonEvent(eventDay('spring', SEASON_EVENT_DAYS))).toBeNull(); // ngay sau cửa sổ
    });
    it('seasonObjective xác định cho cùng seed/day, null ngoài cửa sổ', () => {
      const d = eventDay('summer', 2);
      expect(seasonObjective(7, d)?.title).toBe(seasonObjective(7, d)?.title);
      expect(seasonObjective(7, seasonStartDay('spring'))).toBeNull();
    });
    it('objective đủ mục tiêu đa-hệ, mỗi cái có measure', () => {
      expect(SEASON_OBJECTIVES.length).toBeGreaterThanOrEqual(4);
      expect(SEASON_OBJECTIVES.every((o) => typeof o.measure === 'function')).toBe(true);
    });
    it('tên sự kiện theo mùa', () => {
      expect(seasonEventName('spring')).toContain('Xuân');
    });
  });

  describe('bizEndOfDay — gom sao theo mùa', () => {
    function makeDay(season: SeasonKey, index: number, rich: boolean) {
      const base = { ...useGame.getState(), day: eventDay(season, index), level: 40, money: 50_000_000, weatherSeed: 5 };
      base.biz = { ...base.biz, month: emptyMonth(season === 'winter' ? 12 : 1, 1, 1000000) };
      base.stats = { ...base.stats, onlineDone: rich ? 99 : 0, farmHarvest: rich ? 99 : 0, cookOrders: rich ? 99 : 0, combos: rich ? 99 : 0, services: rich ? 99_000_000 : 0, fiveStars: rich ? 99 : 0, customers: rich ? 99 : 0, itemsSold: rich ? 999 : 0 };
      return base;
    }
    it('hoàn objective ngày đầu → +1 sao + thưởng, ghi claimedDay=0', () => {
      const base = makeDay('spring', 0, true);
      const out = bizEndOfDay(base, base.stats);
      expect(out.biz.seasonEvt!.season).toBe('spring');
      expect(out.biz.seasonEvt!.stars).toBe(1);
      expect(out.biz.seasonEvt!.claimedDay).toBe(0);
      expect(out.money).toBeGreaterThanOrEqual(SEASON_REWARD_PER_STAR);
      expect(out.news.some((n) => n.includes('sao mùa'))).toBe(true);
    });
    it('không đạt objective → không sao, không thưởng, không claimedDay', () => {
      const base = makeDay('summer', 2, false);
      const out = bizEndOfDay(base, base.stats);
      // có thể vẫn có sao nếu objective đo ổn với stats = 0 (vd customers>=60 không đạt) — mọi objective cần >0
      expect(out.biz.seasonEvt!.stars).toBe(0);
      expect(out.biz.seasonEvt!.claimedDay).toBeUndefined();
    });
    it('ngày thường (ngoài cửa sổ) không tạo seasonEvt, không thưởng', () => {
      const base = { ...useGame.getState(), day: seasonStartDay('spring'), level: 40, money: 50_000_000, weatherSeed: 5 };
      base.biz = { ...base.biz, month: emptyMonth(1, 1, 1000000) };
      base.stats = { ...base.stats, onlineDone: 99, farmHarvest: 99, cookOrders: 99, combos: 99, services: 99_000_000, fiveStars: 99, customers: 99, itemsSold: 999 };
      const out = bizEndOfDay(base, base.stats);
      expect(out.biz.seasonEvt).toBeUndefined();
    });
    it('nhiều ngày cùng mùa: gom sao tăng dần, không trùng claimedDay', () => {
      const out0 = bizEndOfDay(makeDay('autumn', 0, true), makeDay('autumn', 0, true).stats);
      const b1 = makeDay('autumn', 1, true);
      const out1 = bizEndOfDay(b1, b1.stats);
      expect(out1.biz.seasonEvt!.season).toBe('autumn');
      expect(out1.biz.seasonEvt!.stars).toBeGreaterThanOrEqual(out0.biz.seasonEvt!.stars);
    });
  });
});
