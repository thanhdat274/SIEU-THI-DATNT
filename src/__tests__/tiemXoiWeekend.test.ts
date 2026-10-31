import { describe, expect, it } from 'vitest';
import { isWeekend } from '../data/calendar';
import { TIEM_XOI_WEEKEND_MUL, tiemXoiDinePlan, tiemXoiIds, tiemXoiWeekendMul } from '../data/tiemXoi';

/** GĐ530 — cuối tuần khách ngồi ăn tiệm xôi đông hơn. */
describe('tiemXoiWeekendMul', () => {
  const we = Array.from({ length: 14 }, (_, i) => i + 1).find(isWeekend)!;
  const wd = Array.from({ length: 14 }, (_, i) => i + 1).find((d) => !isWeekend(d))!;

  it('cuối tuần ×1,15, ngày thường/không rõ ngày ×1', () => {
    expect(tiemXoiWeekendMul(we)).toBe(TIEM_XOI_WEEKEND_MUL);
    expect(tiemXoiWeekendMul(wd)).toBe(1);
    expect(tiemXoiWeekendMul()).toBe(1);
  });

  it('kho đủ thì cuối tuần bán nhiều suất hơn', () => {
    const level = 50;
    const storage = Object.fromEntries(tiemXoiIds(level).map((id) => [id, 999]));
    const t = { open: true, staff: 2, big: false } as Parameters<typeof tiemXoiDinePlan>[0];
    const a = tiemXoiDinePlan(t, level, storage, 'sunny', wd).portions;
    const b = tiemXoiDinePlan(t, level, storage, 'sunny', we).portions;
    expect(b).toBe(Math.round(a * TIEM_XOI_WEEKEND_MUL));
  });
});
