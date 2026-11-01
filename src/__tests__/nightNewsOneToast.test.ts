import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../data/biz';
import { newGameData, useGame } from '../core/store';

/** GĐ568: tin đêm không còn đè nhau trong một ô thông báo — gom một toast, đủ ở lastSummary.news. */
const g = () => useGame.getState();
let msgs: string[] = [];
beforeEach(() => {
  msgs = [];
  useGame.setState({ ...newGameData(), day: 3, level: 5, money: 10_000_000, notify: (m: string) => { msgs.push(m); } });
});
afterEach(() => vi.restoreAllMocks());

describe('tin đêm gom một toast (GĐ568)', () => {
  it('chi phí vận hành vào Sổ đầu ngày, toast mở đầu bằng thời tiết, ≤90 ký tự', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const s = g();
    useGame.setState({ minutes: 20 * 60, stats: { ...s.stats, revenue: 2_000_000 }, biz: { ...s.biz, achievements: ACHIEVEMENTS.map((a) => a.id) } });
    expect(g().sleep()).toBe(true);
    const news = g().lastSummary?.news ?? [];
    expect(news.some((n) => n.includes('Chi phí vận hành'))).toBe(true);
    const morning = msgs.find((m) => m.startsWith('Hôm nay:'));
    expect(morning).toBeTruthy();
    expect([...morning!].length).toBeLessThanOrEqual(90);
    expect(msgs.some((m) => m.startsWith('💡 Chi phí vận hành'))).toBe(false);
  });
});
