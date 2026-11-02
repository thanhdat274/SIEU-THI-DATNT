import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SummaryMoneyCards } from '../ui/panels/SummaryCards';

const render = (p: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(SummaryMoneyCards, { loyaltyPay: null, happyPay: null, missRev: null, spoilNite: null, openPanel: () => {}, ...p } as never));

describe('SummaryMoneyCards (GĐ955)', () => {
  it('không có dữ liệu thì không vẽ gì', () => {
    expect(render({})).toBe('');
  });
  it('hết hàng bỏ lỡ + hỏng đêm qua hiện đúng thẻ', () => {
    const html = render({
      missRev: { totalLoss: 5000, rows: [{ id: 'a', name: 'Sữa', estLoss: 5000 }], inStorageCount: 0, outOfStockCount: 1 },
      spoilNite: { totalCost: 3000, rows: [{ id: 'b', name: 'Rau', spoiled: 2, cost: 3000, kind: 'cold' }] },
    });
    expect(html).toContain('Hết hàng bỏ lỡ');
    expect(html).toContain('Đêm qua hỏng');
    expect(html).toContain('cần lạnh để ngoài tủ');
  });
});
