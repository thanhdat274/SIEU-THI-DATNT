import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MorningSubtitle } from '../ui/panels/MorningSubtitle';

const r = (autoNote?: string) => renderToStaticMarkup(createElement(MorningSubtitle, { weatherSeed: 1, day: 5, weather: 'sunny', tomorrow: 'sunny', level: 5, rent: 50000, autoNote }));
describe('GĐ943 — MorningSubtitle', () => {
  it('có tiền nhà, dự báo khách mai và lời nhắc nhập hàng', () => {
    const h = r(); expect(h).toContain('Tiền nhà trả cuối ngày'); expect(h).toContain('khách ghé'); expect(h).toContain('nhập hàng bày kệ');
  });
  it('ghi chú lịch tự động chỉ hiện khi có', () => {
    expect(r()).not.toContain('NOTE-X'); expect(r('NOTE-X')).toContain('NOTE-X');
  });
});
