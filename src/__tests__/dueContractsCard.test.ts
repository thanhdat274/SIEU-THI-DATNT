import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DueContractsCard } from '../ui/panels/DueContractsCard';
import { supplyContractById } from '../data/contracts';

/** GĐ935 — DueContractsCard tách khỏi MorningPanel: hiện hạn hôm nay / quá hạn / ngày mai. */
describe('GĐ935 — DueContractsCard', () => {
  const def = supplyContractById('quan_nhau');
  const render = (dueDay: number, day = 10) => renderToStaticMarkup(createElement(DueContractsCard, {
    dueContracts: [{ cs: { defId: 'quan_nhau', dueDay, delivered: 0, pending: false, streak: 0 } as never, def }], day, storage: {},
  }));
  it('có định nghĩa hợp đồng', () => expect(def).toBeTruthy());
  it('hạn hôm nay / quá hạn / ngày mai', () => {
    expect(render(10)).toContain('HẠN HÔM NAY');
    expect(render(9)).toContain('QUÁ HẠN');
    expect(render(11)).toContain('hạn ngày mai');
  });
  it('tiêu đề thẻ', () => expect(render(10)).toContain('Hợp đồng tới kỳ giao'));
});
