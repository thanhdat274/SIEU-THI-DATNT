import { describe, it, expect } from 'vitest';
import { newGameData } from '../core/store';
import { useGame } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { emptyYear, yearOf, yearStart, yearEnd, isYearEnd, yearReward, closeYear, type YearTally } from '../data/yearReport';

type GS = ReturnType<typeof useGame.getState>;

const mk = (bizOver: Record<string, unknown> = {}, statsOver: Record<string, unknown> = {}, day = 366): GS => {
  useGame.setState({ ...newGameData(), day: 1 });
  const s = useGame.getState();
  const stats = { ...s.stats, ...statsOver } as GS['stats'];
  const biz = { ...s.biz, ...bizOver } as GS['biz'];
  return { ...s, day, level: 40, money: 50_000_000, biz, stats } as GS;
};

describe('yearOf / year boundaries (khớp YEAR_DAYS=365)', () => {
  it('năm 1 = ngày 1..365, năm 2 = 366..730, năm 3 từ 731', () => {
    expect(yearOf(1)).toBe(1);
    expect(yearOf(365)).toBe(1);
    expect(yearOf(366)).toBe(2);
    expect(yearOf(730)).toBe(2);
    expect(yearOf(731)).toBe(3);
  });
  it('yearStart/yearEnd', () => {
    expect(yearStart(1)).toBe(1);
    expect(yearEnd(1)).toBe(365);
    expect(yearStart(2)).toBe(366);
    expect(yearEnd(2)).toBe(730);
  });
  it('isYearEnd đúng ngày cuối năm', () => {
    expect(isYearEnd(365)).toBe(true);
    expect(isYearEnd(364)).toBe(false);
    expect(isYearEnd(730)).toBe(true);
  });
  it('emptyYear zero-mọi-trường + đúng year/startDay', () => {
    const t = emptyYear(1, 1);
    expect(t).toEqual({ year: 1, startDay: 1, revenue: 0, profit: 0, customers: 0, unhappy: 0, seasonStars: 0 });
  });
  it('yearReward theo cấp, làm tròn nghìn', () => {
    expect(yearReward(1)).toBe(265000); // 250000 + 15000
    expect(yearReward(40)).toBe(850000); // 250000 + 600000
  });
  it('closeYear giữ số tích lũy + reward + endDay', () => {
    const t: YearTally = { year: 1, startDay: 1, revenue: 1_000_000, profit: 200_000, customers: 300, unhappy: 2, seasonStars: 7 };
    const r = closeYear(t, 365, 40);
    expect(r.year).toBe(1);
    expect(r.endDay).toBe(365);
    expect(r.revenue).toBe(1_000_000);
    expect(r.seasonStars).toBe(7);
    expect(r.reward).toBe(yearReward(40));
  });
});

describe('bizEndOfDay — nhịp năm', () => {
  it('ngày trong năm tích lũy revenue/profit/customers/unhappy vào b.year', () => {
    const s = mk({ year: emptyYear(1, 1) }, { revenue: 100_000, spent: 60_000, wages: 5_000, customers: 30, unhappy: 1 }, 100);
    const out = bizEndOfDay(s, s.stats);
    expect(out.biz.year.revenue).toBe(100_000);
    expect(out.biz.year.profit).toBe(100_000 - 60_000 - 5_000);
    expect(out.biz.year.customers).toBe(30);
    expect(out.biz.year.unhappy).toBe(1);
  });

  it('sang năm mới (ngày 366) → khép năm 1: thưởng tròn năm + lastYear + reset', () => {
    const base = mk({ year: emptyYear(366, 2) }); // đã sang năm 2, không có chuyển năm
    const test = mk({ year: { ...emptyYear(1, 1), revenue: 1_234_567 } });
    const outB = bizEndOfDay(base, base.stats);
    const outT = bizEndOfDay(test, test.stats);
    expect(outT.money - outB.money).toBe(yearReward(40));
    expect(outT.biz.lastYear!.year).toBe(1);
    expect(outT.biz.lastYear!.revenue).toBe(1_234_567);
    expect(outT.biz.lastYear!.reward).toBe(yearReward(40));
    expect(outT.biz.year.year).toBe(2);
    expect(outT.news.some((n) => n.includes('Tròn 1 năm'))).toBe(true);
  });

  it('đổi mùa trong năm → gom sao mùa vừa rồi vào năm, không tính 2 lần', () => {
    // Mùa xuân kết thúc ngày 151, sang hè bắt đầu ngày 152 (seasonOf).
    useGame.setState({ ...newGameData(), day: 152 });
    const s = useGame.getState();
    const biz = {
      ...s.biz,
      year: emptyYear(1, 1),
      seasonEvt: { season: 'spring' as const, stars: 3 },
    };
    const out = bizEndOfDay({ ...s, day: 152, level: 40, biz }, s.stats);
    expect(out.biz.year.seasonStars).toBe(3);
    expect(out.biz.seasonEvt!.stars).toBe(0);
    // Chạy tiếp một ngày nữa cùng mùa → không cộng lại nữa
    const out2 = bizEndOfDay({ ...s, day: 153, level: 40, biz: out.biz }, s.stats);
    expect(out2.biz.year.seasonStars).toBe(3);
  });

  it('khép năm: gom sao mùa đang chạy (winter) về năm đúng 1 lần', () => {
    const base = mk({ year: emptyYear(366, 2) });
    const test = mk({ year: emptyYear(1, 1), seasonEvt: { season: 'winter' as const, stars: 2 } });
    const outT = bizEndOfDay(test, test.stats);
    const outB = bizEndOfDay(base, base.stats);
    expect(outT.biz.lastYear!.seasonStars).toBe(2); // không bị đếm lại thành 4
    expect(outT.money - outB.money).toBe(yearReward(40));
    expect(outT.biz.seasonEvt!.stars).toBe(0);
  });

  it('deterministic: hai lượt chạy y hệt → cùng delta thưởng', () => {
    const a = bizEndOfDay(mk({ year: emptyYear(1, 1) }), mk({ year: emptyYear(1, 1) }).stats);
    const b = bizEndOfDay(mk({ year: emptyYear(1, 1) }), mk({ year: emptyYear(1, 1) }).stats);
    expect(a.money).toBe(b.money);
  });
});

describe('save-safe', () => {
  it('newBiz có year=emptyYear(1,1) và lastYear=null', () => {
    const s = useGame.getState();
    expect(s.biz.year).toEqual(emptyYear(1, 1));
    expect(s.biz.lastYear).toBeNull();
  });
});
