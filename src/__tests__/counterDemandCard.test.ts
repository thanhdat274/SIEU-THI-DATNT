import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CounterDemandCard } from '../ui/panels/CounterDemandCard';
import { demandForecast } from '../data/counterDemand';

/** GĐ920 — CounterDemandCard tách khỏi MorningPanel: dựng được (SSR) và hiện đủ tiêu đề + dòng nếp vận hành. */
describe('GĐ920 — CounterDemandCard', () => {
  it('dựng thẻ "Nhu cầu quầy hôm nay" kèm chuỗi ngày sạch', () => {
    const demand = demandForecast({ level: 5, day: 3, weatherSeed: 1 });
    const html = renderToStaticMarkup(createElement(CounterDemandCard, { demand, cleanStreak: 4, cleanBest: 9, cleanExtra: 'đã đạt' }));
    expect(html).toContain('Nhu cầu quầy hôm nay');
    expect(html).toContain('kỷ lục');
  });
});
