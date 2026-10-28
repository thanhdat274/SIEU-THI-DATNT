import { describe, expect, it } from 'vitest';
import {
  MILESTONES, milestoneDone, milestonePct, nearestMilestones, type MilestoneDossier,
} from '../data/goals';

/** Mồi "Sắp đạt": lọc mốc gần xong để nhắc người chơi tiếp tục — thuần tính từ dossier. */

const base = (over: Partial<MilestoneDossier> = {}): MilestoneDossier => ({
  level: 5, day: 3, revenue: 30_000_000, itemsSold: 400, customers: 200, ...over,
});

describe('milestonePct / milestoneDone', () => {
  it('tiến độ chặn về [0,1], đạt thì 1', () => {
    const d = base();
    expect(milestonePct(MILESTONES.find((m) => m.id === 'lv10')!, { ...d, level: 0 })).toBe(0);
    expect(milestonePct(MILESTONES.find((m) => m.id === 'lv10')!, { ...d, level: 10 })).toBe(1);
    expect(milestoneDone(MILESTONES.find((m) => m.id === 'lv20')!, { ...d, level: 25 })).toBe(true);
  });

  it('mốc doanh thu và món tính đúng theo key', () => {
    const rev = MILESTONES.find((m) => m.id === 'rev100m')!;
    expect(milestonePct(rev, base({ revenue: 50_000_000 }))).toBe(0.5);
    const items = MILESTONES.find((m) => m.id === 'items1k')!;
    expect(milestonePct(items, base({ itemsSold: 250 }))).toBe(0.25);
  });
});

describe('nearestMilestones', () => {
  it('chỉ trả mốc chưa đạt có tiến độ > 0, sắp theo tiến độ giảm dần, tối đa n', () => {
    const d = base(); // lv5, ngày3, 30tr, 400 món, 200 khách
    const steps = nearestMilestones(d, 3);
    expect(steps).toHaveLength(3);
    expect(steps[0].pct).toBeGreaterThanOrEqual(steps[1].pct);
    expect(steps[1].pct).toBeGreaterThanOrEqual(steps[2].pct);
    for (const s of steps) {
      expect(s.pct).toBeGreaterThan(0);
      expect(s.pct).toBeLessThan(1);
      expect(s.remaining).toBeGreaterThan(0);
    }
  });

  it('mốc đã đạt bị loại bỏ', () => {
    // 30tr đã đạt rev1m(1M) và rev50m chưa; rev1m không được nhắc lại
    const d = base({ revenue: 30_000_000 });
    const ids = nearestMilestones(d, 10).map((s) => s.m.id);
    expect(ids).not.toContain('rev1m');
    expect(ids).toContain('rev50m'); // 30/50 = 60% — ứng viên sáng nhất
  });

  it('càng gần đạt càng lên đầu; ví dụ 90% doanh thu 100tr đứng đầu', () => {
    const d = base({ revenue: 90_000_000 }); // 90% của rev100m
    expect(nearestMilestones(d, 1)[0].m.id).toBe('rev100m');
    expect(nearestMilestones(d, 1)[0].pct).toBeCloseTo(0.9);
  });

  it('dossier rỗng hoặc mọi mốc đã xong thì không ra mốc nào', () => {
    expect(nearestMilestones({ level: 999, day: 999, revenue: 1e12, itemsSold: 1e7, customers: 1e6 }, 3)).toEqual([]);
  });

  it('có đủ mốc level lớn cuối run (80/90) để mồi cày lên đỉnh', () => {
    const ids = MILESTONES.map((m) => m.id);
    expect(ids).toContain('lv80');
    expect(ids).toContain('lv90');
  });
});
