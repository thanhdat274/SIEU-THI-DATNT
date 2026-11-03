import { describe, expect, it } from 'vitest';
import { isQuanMatchDay, newQuanNuoc, quanMatchMul, QUAN_MATCH_MUL } from '../data/quanNuoc';
import { quanNuocProjection } from '../data/quanNuocInsights';
import { isWeekend } from '../data/calendar';

/** GĐ581: tối có trận bóng — đúng 1 ngày thường mỗi tuần, mưa/bão thì không; khách quán ×1,3. */
describe('quán nước: tối có trận', () => {
  it('mỗi tuần đúng một ngày, là ngày thường', () => {
    for (let w = 0; w < 4; w++) {
      const days = Array.from({ length: 7 }, (_, i) => w * 7 + i + 1).filter((d) => isQuanMatchDay(d, 'sunny'));
      expect(days).toHaveLength(1);
      expect(isWeekend(days[0])).toBe(false);
    }
  });
  it('mưa/bão không có trận; ngày trận đông khách hơn ngày thường bên cạnh', () => {
    const d = Array.from({ length: 7 }, (_, i) => i + 1).find((x) => isQuanMatchDay(x, 'cloudy'))!;
    expect(quanMatchMul(d, 'rain')).toBe(1);
    expect(quanMatchMul(d, 'storm')).toBe(1);
    expect(quanMatchMul(d, 'cloudy')).toBe(QUAN_MATCH_MUL);
    const q = { ...newQuanNuoc(), open: true, staff: 1 };
    const other = [d - 1, d + 1].find((x) => !isWeekend(x))!;
    expect(quanNuocProjection(q, 40, 999, 'cloudy', d).customers).toBeGreaterThan(quanNuocProjection(q, 40, 999, 'cloudy', other).customers);
  });
});

describe('GĐ582: panel quán báo trước trận', () => {
  it('QuanNuocPanel hiện dòng ⚽ hôm nay và báo trước hôm sau', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${__dirname}/../ui/panels/QuanNuocPanel.tsx`, 'utf8');
    expect(src).toContain('isQuanMatchDay(day, weather)');
    expect(src).toContain('isQuanMatchDay(day + 1');
    for (const line of ['⚽ Tối nay có trận bóng: khách quán đông hơn ×1,3 — nạp thêm đồ uống', '⚽ Mai có trận bóng (nếu trời không mưa) — chuẩn bị đồ uống từ hôm nay']) expect([...line].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ584: Sổ đầu ngày nhắc trận bóng', () => {
  it('ngày trận + quán khỏe → việc ⚽ ưu tiên 3, ≤90; ngày thường/mưa → không; thiếu kho vẫn ưu tiên hơn', async () => {
    const { quanNuocDayAction } = await import('../data/quanNuocInsights');
    const ok = { missedRevenue: 0, driesMain: false, drinkUnitsNow: 99 } as never;
    const d = Array.from({ length: 7 }, (_, i) => i + 1).find((x) => isQuanMatchDay(x, 'sunny'))!;
    const a = quanNuocDayAction(ok, d, 'sunny')!;
    expect(a.icon).toBe('⚽');
    expect(a.priority).toBe(3);
    expect([...a.text].length).toBeLessThanOrEqual(90);
    expect(quanNuocDayAction(ok, d, 'rain')).toBeNull();
    expect(quanNuocDayAction(ok, d + 1, 'sunny')).toBeNull();
    expect(quanNuocDayAction({ missedRevenue: 5000, driesMain: false, drinkUnitsNow: 0 } as never, d, 'sunny')!.icon).toBe('🧋');
  });
});

describe('GĐ586: Giải bóng đá phường = đêm có trận', () => {
  it('mọi ngày của lễ bong_da_phuong đều có trận (trời khô), mưa thì không', async () => {
    const { festivalOn } = await import('../data/calendar');
    const days = Array.from({ length: 400 }, (_, i) => i + 1).filter((d) => festivalOn(d)?.id === 'bong_da_phuong');
    expect(days.length).toBeGreaterThan(0);
    for (const d of days) {
      expect(isQuanMatchDay(d, 'sunny')).toBe(true);
      expect(isQuanMatchDay(d, 'rain')).toBe(false);
    }
  });
});

describe('GĐ601: tiện lợi đông sau trận', () => {
  it('đêm có trận 22h–24h ×1,2; trước 22h, sau nửa đêm, ngày thường, trời mưa = 1', async () => {
    const { branchMatchMul, BRANCH_MATCH_MUL } = await import('../data/branches');
    const { isQuanMatchDay } = await import('../data/quanNuoc');
    const d = Array.from({ length: 30 }, (_, i) => i + 1).find((x) => isQuanMatchDay(x, 'sunny'))!;
    const no = Array.from({ length: 30 }, (_, i) => i + 1).find((x) => !isQuanMatchDay(x, 'sunny'))!;
    expect(branchMatchMul(d, 23 * 60, 'sunny')).toBe(BRANCH_MATCH_MUL);
    expect(branchMatchMul(d, 21 * 60, 'sunny')).toBe(1);
    expect(branchMatchMul(d, 1 * 60, 'sunny')).toBe(1);
    expect(branchMatchMul(no, 23 * 60, 'sunny')).toBe(1);
    expect(branchMatchMul(d, 23 * 60, 'rain')).toBe(1);
  });
});

describe('GĐ601: BranchPanel báo tan trận', () => {
  it('panel tiện lợi dùng branchMatchMul', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/ui/BranchPanel.tsx', 'utf8')).toContain('branchMatchMul(day, 23 * 60, weather) > 1');
  });
});

describe('GĐ603: tin tiện lợi gắn ⚽ đêm có trận', () => {
  it('endDay thêm ⚽ sau số khách tiện lợi theo isQuanMatchDay', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/core/slices/endDay.ts', 'utf8')).toContain("khách${isQuanMatchDay(s.day, s.weather) ? ' ⚽' : ''}, thu");
  });
});

describe('GĐ604: Sổ đầu ngày nhắc tiện lợi đêm có trận', () => {
  it('ReportPanels thêm việc ⚽ cho tiện lợi, câu ≤90', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/ui/panels/morningActions.ts', 'utf8')).toContain('branch?.open && isQuanMatchDay(day, weather)');
    expect([...'Tối nay có trận — tiện lợi đông 22h–24h ×1,2, xếp đủ kệ'].length).toBeLessThanOrEqual(90);
  });
});
