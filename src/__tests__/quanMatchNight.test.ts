import { describe, expect, it } from 'vitest';
import { isQuanMatchDay, newQuanNuoc, quanMatchMul, quanNuocProjection, QUAN_MATCH_MUL } from '../data/quanNuoc';
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
