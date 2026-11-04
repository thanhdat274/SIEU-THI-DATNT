import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaffValueLine, NightStrip, StaffIdleLine, ShiftValueStrip, CourierValueLine, StaffPoachWarn } from '../ui/panels/StaffLines';

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
  it('GĐ1181 — CourierValueLine: ẩn khi nodata, chỉ có điện thoại thì hiện doanh thu + lương + nhãn', () => {
    expect(r(CourierValueLine, {})).toBe('');
    expect(r(CourierValueLine, { sv: { verdict: 'nodata', value: 0, wage: 40000, net: -40000 } })).toBe('');
    const html = r(CourierValueLine, { sv: { verdict: 'ok', value: 120000, phoneValue: 120000, onlineSaved: 0, wage: 40000, net: 80000 } });
    expect(html).toContain('Điện thoại');
    expect(html).toContain('120.000đ');
    expect(html).toContain('+80.000đ');
    expect(html).toContain('đáng lương');
  });
  it('GĐ1183 — CourierValueLine: có tiết kiệm phí Grab thì hiện breakdown hai nguồn + tổng', () => {
    const html = r(CourierValueLine, { sv: { verdict: 'ok', value: 180000, phoneValue: 100000, onlineSaved: 80000, wage: 60000, net: 120000 } });
    expect(html).toContain('Điện thoại 100.000đ');
    expect(html).toContain('tiết kiệm phí Grab 80.000đ');
    expect(html).toContain('~180.000đ');
  });
});

describe('StaffPoachWarn (GĐ1185) — cảnh báo nhân viên bị rival máu liều để mắt', () => {
  it('ẩn khi chưa có nguy cơ (không truyền poachRiskId / không rival)', () => {
    expect(r(StaffPoachWarn, { rival: { name: 'M', personality: 'aggressive' }, poachRiskId: undefined })).toBe('');
    expect(r(StaffPoachWarn, { rival: null, poachRiskId: 1 })).toBe('');
    expect(r(StaffPoachWarn, {})).toBe('');
  });
  it('hiện cảnh báo + tên rival + nhãn máu liều khi bị nhắm', () => {
    const html = r(StaffPoachWarn, { rival: { name: 'Tạp hóa Liều', personality: 'aggressive' }, poachRiskId: 1 });
    expect(html).toContain('⚠️');
    expect(html).toContain('Tạp hóa Liều');
    expect(html).toContain('máu liều');
    expect(html).toContain('để mắt');
  });
});
