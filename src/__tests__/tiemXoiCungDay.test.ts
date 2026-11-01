import { describe, expect, it } from 'vitest';
import { dateOfDoy, dayOfYear } from '../data/calendar';
import { isXoiCungDay, newTiemXoi, tiemXoiCungMul, tiemXoiDinePlan, tiemXoiIds, TIEM_XOI_CUNG_MUL } from '../data/tiemXoi';

/** GĐ587: ngày cúng (ngày 1 & 15 lịch game) khách ăn xôi ×1,3. */
describe('tiệm xôi: ngày cúng', () => {
  it('đúng 2 ngày mỗi tháng (ngày 1 và 15)', () => {
    const days = Array.from({ length: 365 }, (_, i) => i + 1).filter((d) => isXoiCungDay(d));
    expect(days.length).toBe(24);
    for (const d of days) expect([1, 15]).toContain(dateOfDoy(dayOfYear(d)).day);
    expect(tiemXoiCungMul(undefined)).toBe(1);
  });
  it('ngày cúng ăn tại chỗ nhiều suất hơn ngày thường cùng thứ', () => {
    const t = { ...newTiemXoi(), open: true, staff: 2 };
    const storage = Object.fromEntries(tiemXoiIds(45).map((id) => [id, 999]));
    const cung = Array.from({ length: 60 }, (_, i) => i + 1).find((d) => isXoiCungDay(d))!;
    const plain = cung + 7;
    expect(isXoiCungDay(plain)).toBe(false);
    const a = tiemXoiDinePlan(t, 45, storage, 'cloudy', cung).portions;
    const b = tiemXoiDinePlan(t, 45, storage, 'cloudy', plain).portions;
    expect(a).toBe(Math.round(b * TIEM_XOI_CUNG_MUL));
  });
});
