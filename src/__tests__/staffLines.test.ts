import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaffValueLine, NightStrip, StaffIdleLine, ShiftValueStrip, CourierValueLine } from '../ui/panels/StaffLines';

const r = (c: unknown, p: Record<string, unknown>) => renderToStaticMarkup(createElement(c as never, p as never));

describe('StaffLines (GĐ956)', () => {
  it('ẩn khi không có dữ liệu', () => {
    expect(r(StaffValueLine, {})).toBe('');
    expect(r(StaffValueLine, { sv: { verdict: 'nodata' } })).toBe('');
    expect(r(NightStrip, { p: { verdict: 'idle' } })).toBe('');
    expect(r(StaffIdleLine, {})).toBe('');
    expect(r(ShiftValueStrip, { sum: { morning: { count: 0 }, afternoon: { count: 0 }, full: { count: 0 } }, hasData: true })).toBe('');
  });
  it('hiện nhãn đáng lương / đang lỗ', () => {
    expect(r(StaffValueLine, { sv: { verdict: 'ok', value: 100, wage: 50, net: 50 } })).toContain('đáng lương');
    expect(r(StaffValueLine, { sv: { verdict: 'low', value: 10, wage: 50, net: -40 } })).toContain('đang lỗ');
  });
  it('GĐ1181 — CourierValueLine: ẩn khi nodata, hiện doanh thu điện thoại + lương + nhãn', () => {
    expect(r(CourierValueLine, {})).toBe('');
    expect(r(CourierValueLine, { sv: { verdict: 'nodata', value: 0, wage: 40000, net: -40000 } })).toBe('');
    const html = r(CourierValueLine, { sv: { verdict: 'ok', value: 120000, wage: 40000, net: 80000 } });
    expect(html).toContain('Điện thoại hôm nay');
    expect(html).toContain('120.000đ');
    expect(html).toContain('+80.000đ');
    expect(html).toContain('đáng lương');
  });
});
