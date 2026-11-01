import { describe, it, expect } from 'vitest';
import { newGameData } from '../core/store';
import { useGame } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import {
  ALMANAC_MILESTONES, ALMANAC_SEASONS, readAlmanac, almanacMilestoneReward,
  nextAlmanacMilestone, newlyReachedAlmanac,
} from '../data/seasonAlmanac';

type GS = ReturnType<typeof useGame.getState>;

const mk = (bizOver: Record<string, unknown> = {}, statsOver: Record<string, unknown> = {}, day = 104): GS => {
  useGame.setState({ ...newGameData(), day: 1 });
  const s = useGame.getState();
  const stats = { ...s.stats, ...statsOver } as GS['stats'];
  const biz = { ...s.biz, ...bizOver } as GS['biz'];
  return { ...s, day, level: 40, money: 50_000_000, biz, stats } as GS;
};

/** Stats thoả MỌI mục tiêu mùa → chắc chắn kiếm 1 sao trong cửa sổ mùa xuân (ngày 104). */
const SATISFY_ALL = { onlineDone: 3, farmHarvest: 8, cookOrders: 4, combos: 3, services: 50_000, fiveStars: 3 };

describe('readAlmanac / helpers', () => {
  it('không có dữ liệu → toàn 0, total 0, favorite null, seasonsTouched 0', () => {
    const a = readAlmanac(undefined);
    expect(a.total).toBe(0);
    expect(a.favorite).toBeNull();
    expect(a.seasonsTouched).toBe(0);
    for (const s of ALMANAC_SEASONS) expect(a.perSeason[s]).toBe(0);
  });
  it('tính per-season + total + favorite đúng', () => {
    const a = readAlmanac({ spring: 5, summer: 2, autumn: 0, winter: 3 });
    expect(a.perSeason.spring).toBe(5);
    expect(a.total).toBe(10);
    expect(a.favorite).toBe('spring');
    expect(a.seasonsTouched).toBe(3);
  });
  it('almanacMilestoneReward công thức + làm tròn nghìn', () => {
    // 150000 + level*5000 + at*2000, round1k
    expect(almanacMilestoneReward(15, 40)).toBe(Math.round((150000 + 40 * 5000 + 15 * 2000) / 1000) * 1000);
  });
  it('nextAlmanacMilestone: mốc kế chưa đủ kèm remaining', () => {
    const n = nextAlmanacMilestone(10, []);
    expect(n!.at).toBe(15);
    expect(n!.remaining).toBe(5);
  });
  it('nextAlmanacMilestone: null khi đã qua mốc cuối', () => {
    expect(nextAlmanacMilestone(60, [15, 30, 50])).toBeNull();
  });
  it('newlyReachedAlmanac: chỉ mốc đủ sao nhưng chưa nhận', () => {
    expect(newlyReachedAlmanac(16, [15])).toEqual([]); // 15 đã nhận, 30 chưa đủ
    expect(newlyReachedAlmanac(32, [15])).toEqual([30]);
    expect(newlyReachedAlmanac(32, [15, 30, 50])).toEqual([]);
  });
});

describe('bizEndOfDay — Sổ Mùa gom sao mọi mùa', () => {
  it('kiếm sao mùa → seasonAlmanac[mùa] tăng + total tăng (bên cạnh seasonEvt)', () => {
    const s = mk({ seasonAlmanac: {} }, SATISFY_ALL);
    const out = bizEndOfDay(s, s.stats);
    expect(out.biz.seasonAlmanac!.spring).toBe(1);
    expect(readAlmanac(out.biz.seasonAlmanac).total).toBe(1);
    expect(out.biz.seasonEvt!.stars).toBe(1);
  });

  it('ngày mùa tiếp theo → cộng dồn (không reset trong cùng mùa)', () => {
    const s = mk({ seasonAlmanac: {} }, SATISFY_ALL, 103);
    const out1 = bizEndOfDay(s, s.stats);
    const out2 = bizEndOfDay(mk({ seasonAlmanac: out1.biz.seasonAlmanac }, SATISFY_ALL, 104), mk({ seasonAlmanac: out1.biz.seasonAlmanac }, SATISFY_ALL, 104).stats);
    expect(out2.biz.seasonAlmanac!.spring).toBe(2);
  });

  it('chạm mốc 15 → thưởng đúng 1 lần + news + claimed', () => {
    const base = mk({ seasonAlmanac: { spring: 14 }, almanacClaimed: [15] }, SATISFY_ALL);
    const test = mk({ seasonAlmanac: { spring: 14 }, almanacClaimed: [] }, SATISFY_ALL);
    const outB = bizEndOfDay(base, base.stats);
    const outT = bizEndOfDay(test, test.stats);
    expect(outT.biz.almanacClaimed).toContain(15);
    expect(outT.money - outB.money).toBe(almanacMilestoneReward(15, 40));
    expect(outT.news.some((n) => n.includes('Sổ Mùa'))).toBe(true);
  });

  it('không trả lại khi đã nhận mốc (ngày sau cùng tổng)', () => {
    const s = mk({ seasonAlmanac: { spring: 15 }, almanacClaimed: [15] }, SATISFY_ALL, 105);
    const out = bizEndOfDay(s, s.stats);
    expect(out.biz.almanacClaimed).toEqual([15]);
    expect(out.news.some((n) => n.includes('Sổ Mùa'))).toBe(false);
  });

  it('vượt nhiều mốc cùng lúc → nhận hết (15 + 30)', () => {
    const test = mk({ seasonAlmanac: { spring: 29 }, almanacClaimed: [] }, SATISFY_ALL);
    const out = bizEndOfDay(test, test.stats);
    expect(out.biz.almanacClaimed).toEqual(expect.arrayContaining([15, 30]));
  });

  it('deterministic: hai lượt y hệt → cùng delta thưởng', () => {
    const a = bizEndOfDay(mk({ seasonAlmanac: { spring: 14 }, almanacClaimed: [] }, SATISFY_ALL), mk({ seasonAlmanac: { spring: 14 }, almanacClaimed: [] }, SATISFY_ALL).stats);
    const b = bizEndOfDay(mk({ seasonAlmanac: { spring: 14 }, almanacClaimed: [] }, SATISFY_ALL), mk({ seasonAlmanac: { spring: 14 }, almanacClaimed: [] }, SATISFY_ALL).stats);
    expect(a.money).toBe(b.money);
  });
});

describe('save-safe', () => {
  it('newBiz mặc định seasonAlmanac={} và almanacClaimed=[]', () => {
    const s = useGame.getState();
    expect(s.biz.seasonAlmanac).toEqual({});
    expect(s.biz.almanacClaimed).toEqual([]);
  });
});
