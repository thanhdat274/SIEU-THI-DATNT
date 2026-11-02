import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PRESTIGE_TITLES } from '../data/titles';
import { NearMilestonesView, NextUnlockTeaser, NgGoalsCard } from '../ui/panels/PrestigeParts';

const noop = () => {};
const goals = [
  { id: 'a', icon: '🅰', name: 'Mốc A', desc: 'mô tả A', reward: 100000, done: true },
  { id: 'b', icon: '🅱', name: 'Mốc B', desc: 'mô tả B', reward: 200000, done: true },
  { id: 'c', icon: '©', name: 'Mốc C', desc: 'mô tả C', reward: 300000, done: false },
] as never;
describe('GĐ954 — PrestigeParts', () => {
  it('NearMilestonesView: rỗng thì ẩn, có mốc thì hiện còn bao nhiêu', () => {
    expect(renderToStaticMarkup(createElement(NearMilestonesView, { steps: [] }))).toBe('');
    const h = renderToStaticMarkup(createElement(NearMilestonesView, { steps: [{ m: { id: 'm', icon: '🏁', name: 'Mốc X', key: 'level' }, pct: 0.5, remaining: 2 }] as never }));
    expect(h).toContain('Mốc X'); expect(h).toContain('còn 2 cấp'); expect(h).toContain('width:50%');
  });
  it('NgGoalsCard: ẩn ở vòng 0; vòng 1 có nút nhận / đã nhận / chưa đạt', () => {
    expect(renderToStaticMarkup(createElement(NgGoalsCard, { prestigeLevel: 0, cachedGoals: goals, claimedIds: [], onClaim: noop }))).toBe('');
    const h = renderToStaticMarkup(createElement(NgGoalsCard, { prestigeLevel: 1, cachedGoals: goals, claimedIds: ['b'], onClaim: noop }));
    expect(h).toContain('Đạt 2/3'); expect(h).toContain('Nhận +'); expect(h).toContain('✓ Đã nhận'); expect(h).toContain('Chưa đạt');
  });
  it('NextUnlockTeaser: mức đủ cao thì không còn gì để mồi', () => {
    const max = Math.max(...PRESTIGE_TITLES.map((t) => t.prestige ?? 0)) + 50;
    expect(renderToStaticMarkup(createElement(NextUnlockTeaser, { prestige: max }))).toBe('');
    const low = renderToStaticMarkup(createElement(NextUnlockTeaser, { prestige: 0 }));
    expect(low === '' || low.includes('NG+')).toBe(true);
  });
});
