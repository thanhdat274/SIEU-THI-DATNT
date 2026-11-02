import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayActionsCard } from '../ui/panels/TodayActionsCard';

const a = (text: string, danger: boolean) => ({ icon: '🏦', text, panel: 'business', danger, priority: 0 });
const r = (actions: ReturnType<typeof a>[]) => renderToStaticMarkup(createElement(TodayActionsCard, { actions, onOpen: () => {} }));
describe('GĐ942 — TodayActionsCard', () => {
  it('rỗng thì không dựng gì', () => expect(r([])).toBe(''));
  it('việc bức thiết đỏ + nhãn "bức thiết", việc thường "nên làm"', () => {
    const h = r([a('Trả nợ', true), a('Dọn kho', false)]);
    expect(h).toContain('Việc hôm nay'); expect(h).toContain('bức thiết'); expect(h).toContain('nên làm'); expect(h).toContain('#e74c3c');
    expect((h.match(/<button/g) ?? []).length).toBe(2);
  });
});
