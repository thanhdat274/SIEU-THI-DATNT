import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaffValueLine, NightStrip, StaffIdleLine, ShiftValueStrip } from '../ui/panels/StaffLines';

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
});
