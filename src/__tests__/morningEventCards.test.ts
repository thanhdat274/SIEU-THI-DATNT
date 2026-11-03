import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AlleyTodayCard, SeasonEventCard } from '../ui/panels/MorningEventCards';
import { seasonEvent } from '../data/seasonEvent';
import { newGameData } from '../core/store';

/** GĐ933 — hai thẻ tách khỏi MorningPanel dựng được (SSR). */
describe('GĐ933 — MorningEventCards', () => {
  it('thẻ Con hẻm hôm nay có tiêu đề', () => {
    expect(renderToStaticMarkup(createElement(AlleyTodayCard, { weatherSeed: 1, day: 2, level: 3 }))).toContain('Con hẻm hôm nay');
  });
  it('thẻ sự kiện mùa chỉ hiện khi đang có sự kiện', () => {
    const biz = newGameData().biz;
    let day = 1;
    while (day < 800 && !seasonEvent(day)) day++;
    expect(seasonEvent(day)).toBeTruthy();
    expect(renderToStaticMarkup(createElement(SeasonEventCard, { day, weatherSeed: 1, biz }))).toContain('sao mùa');
    let off = 1;
    while (off < 800 && seasonEvent(off)) off++;
    expect(renderToStaticMarkup(createElement(SeasonEventCard, { day: off, weatherSeed: 1, biz }))).toBe('');
  });
});
