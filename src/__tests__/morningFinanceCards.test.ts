import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DailyBurnCard, LoanBurdenCard, SolvencyCard } from '../ui/panels/MorningFinanceCards';
import { dailyBurn } from '../data/dailyBurn';
import { loanBurden } from '../data/loanBurden';
import { solvency } from '../data/solvency';

/** GĐ926 — ba thẻ tài chính tách khỏi MorningPanel dựng được (SSR) từ kết quả hàm thật. */
describe('GĐ926 — MorningFinanceCards', () => {
  it('Lãi vay', () => {
    const html = renderToStaticMarkup(createElement(LoanBurdenCard, { lb: loanBurden(5_000_000, 200_000) }));
    expect(html).toContain('Lãi vay ngốn');
  });
  it('Cân đối', () => {
    const sol = solvency({ money: 100_000, storage: {}, priceOf: () => 1000, loan: { principal: 1_000_000, dueDay: 10 } as never, hui: null, day: 5 } as never);
    expect(renderToStaticMarkup(createElement(SolvencyCard, { sol }))).toContain('Cân đối');
  });
  it('Chi phí cố định', () => {
    const db = dailyBurn([] as never, [] as never, 0 as never, null as never, null as never, 0);
    expect(renderToStaticMarkup(createElement(DailyBurnCard, { db }))).toContain('Chi phí cố định/ngày');
  });
});
