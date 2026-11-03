import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { loadStories } from '../data/biz';
await loadStories(); // cảnh arc nạp lười (setSurpriseArcs) → surpriseArcById/sceneFor có dữ liệu thật

/** GĐ1057 — core/slices/endDay nhánh nhắc "chuyện sự kiện còn dở" (dòng 289–292):
 *  cuối ngày kết tin sáng mai, nếu còn arc chưa kể xong (surpriseArc.done=false) và ngày mai
 *  vẫn trong hạn (day+1 ≤ expiresDay) thì dán thêm `📖 Chuyện hôm qua còn dở: <teaser>`
 *  vào Sổ đầu ngày — neo câu chuyện đa ngày để người chơi nhớ quay lại nghe tiếp (GĐ164). */

const g = () => useGame.getState();

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99); // tránh phát sinh arc mới nhờ maybeSurprise trong endDay
  useGame.setState({
    ...newGameData(),
    day: 10, level: 20, money: 10_000_000, minutes: 20 * 60, notify: () => {},
  });
});

afterEach(() => vi.restoreAllMocks());

const news = () => g().lastSummary?.news ?? [];

describe('GĐ1057 — endDay nhắc chuyện arc còn dở trong tin sáng', () => {
  it('còn arc chưa kể xong trong hạn → tin sáng có "Chuyện hôm qua còn dở" + teaser', () => {
    useGame.setState({
      biz: { ...g().biz, surpriseArc: { arcId: 'arc_mua_roi', step: 0, choices: [], startedDay: 10, expiresDay: 12, done: false } },
    });
    expect(g().sleep()).toBe(true);
    expect(news().some((n) => n.startsWith('📖 Chuyện hôm qua còn dở:'))).toBe(true);
    // teaser thật của cảnh 1 arc_mua_roi
    expect(news().some((n) => n.includes('mưa rào'))).toBe(true);
  });

  it('arc ĐÃ khép (done) → không nhắc', () => {
    useGame.setState({
      biz: { ...g().biz, surpriseArc: { arcId: 'arc_mua_roi', step: 1, choices: [], startedDay: 10, expiresDay: 12, done: true } },
    });
    expect(g().sleep()).toBe(true);
    expect(news().some((n) => n.includes('Chuyện hôm qua còn dở'))).toBe(false);
  });
});
