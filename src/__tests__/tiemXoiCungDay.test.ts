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

describe('GĐ588: panel tiệm xôi báo ngày cúng', () => {
  it('hiện hôm nay + báo trước hôm sau, chữ ≤90', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${__dirname}/../ui/panels/TiemXoiSection.tsx`, 'utf8');
    expect(src).toContain('isXoiCungDay(day + 1)');
    expect([...'🙏 Mai là ngày cúng: khách mua xôi ×1,3 — thợ tự nấu đầy kho ×1,3'].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ589: Sổ đầu ngày nhắc ngày cúng', () => {
  it('ReportPanels thêm việc 🙏 khi tiệm xôi mở và là ngày cúng, ≤90', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${__dirname}/../ui/panels/ReportPanels.tsx`, 'utf8');
    expect(src).toContain('biz.tiemXoi?.open && isXoiCungDay(day)');
    for (const t of ['Hôm nay ngày cúng — khách mua xôi ×1,3, thêm thợ để nấu kịp', 'Hôm nay ngày cúng — khách mua xôi ×1,3, thợ nấu đầy kho']) expect([...t].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ596: ngày cúng nấu đầy kho hơn', () => {
  it('mục tiêu kho ×1,3 ngày cúng, ngày thường như cũ, không truyền ngày = như cũ', async () => {
    const { tiemXoiDay, tiemXoiIds, TIEM_XOI_TARGET, TIEM_XOI_CUNG_MUL, isXoiCungDay } = await import('../data/tiemXoi');
    const t = { open: true, staff: 3, big: false };
    const ids = tiemXoiIds(50);
    const full = Object.fromEntries(ids.map((id) => [id, TIEM_XOI_TARGET]));
    const cung = Array.from({ length: 40 }, (_, i) => i + 1).find((d) => isXoiCungDay(d))!;
    expect(tiemXoiDay(t, 50, full, () => {})!.total).toBe(0);
    expect(tiemXoiDay(t, 50, full, () => {}, cung + 1)!.total).toBe(0);
    const extra = tiemXoiDay(t, 50, full, () => {}, cung)!;
    const want = ids.length * (Math.round(TIEM_XOI_TARGET * TIEM_XOI_CUNG_MUL) - TIEM_XOI_TARGET);
    expect(extra.total).toBe(Math.min(want, 60 * 4));
  });
});

describe('GĐ598: panel tiệm xôi hiện mục tiêu kho ngày cúng', () => {
  it('TiemXoiSection nhân mục tiêu theo tiemXoiCungMul', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/TiemXoiSection.tsx', 'utf8');
    expect(src).toContain('tiemXoiTarget(t) * tiemXoiCungMul(day)');
    expect(src).toContain('thợ tự nấu đầy kho ×1,3');
  });
});

describe('GĐ599: Sổ đầu ngày ngày cúng nhắc thêm thợ khi thiếu', () => {
  it('ReportPanels chọn câu theo số thợ', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/ReportPanels.tsx', 'utf8');
    expect(src).toContain('biz.tiemXoi.staff < TIEM_XOI_MAX_STAFF ?');
  });
});
