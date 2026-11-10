// SPEC-TOI-UU §T1 (lát L1) — buildReport thuần: dựng bản ghi ngày ẩn danh từ state + DayStats.
// KHÔNG đọc localStorage (truyền tham số) để test được trong node. Tập trung vào những chỗ dễ sai:
// moneyBand, fainted, inspectFail, shortfall, used (suy từ DayStats).
import { describe, expect, it } from 'vitest';
import { buildReport, type DayReport } from '../core/dayReport';
import type { DayStats } from '../core/dayStats';
import type { GameState } from '../core/gameTypes';
import { faintMinutes } from '../data/biz';

const base = {
  get() { return undefined; }, set() { return undefined; },
} as unknown as GameState;

function makeState(over: Partial<GameState>) {
  return {
    ...base,
    day: 3,
    level: 12,
    money: 5_000_000,
    minutes: 10 * 60,
    biz: { prestige: { level: 2 }, breakfastDay: 1, quanNuocLast: undefined },
    inspection: { strikes: 0, lastDay: 2, lastPass: true },
    branch: null,
    ...over,
  } as unknown as GameState;
}

const stats: DayStats = { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 40, unhappy: 3, xp: 0 };

const arg = {
  mode: 'solo' as const,
  install: 'test-install',
  build: 'test',
  fps: 60,
  gfx: 'high' as const,
  device: 'desktop' as const,
};

const tele = { day: 3, sessions: 2, realSec: 100, panels: { summary: 1 }, used: ['branch'], unlockedToday: 4 };

describe('dayReport.buildReport', () => {
  it('điền các trường cơ bản + dải tiền', () => {
    const r = buildReport(makeState({}), stats, tele, arg);
    expect(r.v).toBe(1);
    expect(r.day).toBe(3);
    expect(r.level).toBe(12);
    expect(r.prestige).toBe(2);
    expect(r.moneyBand).toBe(2); // 5tr: 1tr..<10tr
    expect(r.customers).toBe(40);
    expect(r.unhappy).toBe(3);
    expect(r.sessions).toBe(2);
    expect(r.realSec).toBe(100);
    expect(r.unlockedToday).toBe(4);
    expect(r.panels).toEqual({ summary: 1 });
    expect(r.mode).toBe('solo');
    expect(r.install).toBe('test-install');
  });

  it('phân dải tiền đúng 5 mức', () => {
    const bands = [-1000, 500_000, 5_000_000, 50_000_000, 1_000_000_000];
    const want: DayReport['moneyBand'][] = [0, 1, 2, 3, 4];
    bands.forEach((m, i) => {
      expect(buildReport(makeState({ money: m }), stats, tele, arg).moneyBand).toBe(want[i]);
    });
  });

  it('bắt cờ ngất khi ngày chạy quá giờ faint (không phải do đi ngủ sớm)', () => {
    const faint = (minutes: number) =>
      buildReport(makeState({ minutes }), stats, tele, arg).fainted;
    // Giờ lớn hơn ngưỡng ngất → xem là bị ngất (ngày kết thúc vì ngất)
    expect(faint(faintMinutes(false) + 1)).toBe(true);
    expect(faint(9 * 60)).toBe(false);
  });

  it('bắt cờ thanh tra trượt hôm nay (lastDay hôm nay mà pass=false)', () => {
    const ok = buildReport(makeState({}), stats, tele, arg).inspectFail;
    expect(ok).toBe(false);

    const fail = buildReport(
      makeState({ inspection: { strikes: 0, lastDay: 3, lastPass: false } }),
      stats, tele, arg,
    ).inspectFail;
    expect(fail).toBe(true);
  });

  it('bắt cờ thiếu két từ stats.shortfall', () => {
    expect(buildReport(makeState({}), stats, tele, arg).shortfall).toBe(false);
    const r = buildReport(makeState({}), { ...stats, shortfall: 800_000 }, tele, arg);
    expect(r.shortfall).toBe(true);
  });

  it('suy used từ DayStats + tele.used, gộp và khử trùng', () => {
    const r = buildReport(
      makeState({ branch: { id: 'x' } as unknown as GameState['branch'] }),
      { ...stats, cookOrders: 5, onlineDone: 2, combos: 1, services: 3, tips: 9, gifts: 1, farmHarvest: 4, clawWins: 1 },
      { ...tele, used: ['branch', 'social'] },
      arg,
    );
    expect(r.used).toContain('cook');
    expect(r.used).toContain('online');
    expect(r.used).toContain('garden');
    expect(r.used).toContain('combo');
    expect(r.used).toContain('services');
    expect(r.used).toContain('dine');
    expect(r.used).toContain('regulars');
    expect(r.used).toContain('claw');
    expect(r.used).toContain('branch'); // từ state lẫn tele, chỉ xuất hiện 1 lần
    expect(r.used).toContain('social');
    expect(r.used.filter((u) => u === 'branch').length).toBe(1);
  });

  it('walkouts lấy từ lượng khách bỏ về vì chờ quầy', () => {
    const r = buildReport(makeState({}), { ...stats, missed: { wait: 6 } }, tele, arg);
    expect(r.walkouts).toBe(6);
  });
});
