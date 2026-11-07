import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { dailyQuests } from '../data/quests';

// GĐ1627 — không việc ngày nào có mục tiêu ≤0 (tự xong không làm gì) ở mọi cấp/ngày/thời tiết.
describe('GĐ1627 — mục tiêu việc ngày luôn dương', () => {
  it('cấp 1–100 × 28 ngày', () => {
    const bad: string[] = [];
    for (const level of [1, 3, 6, 8, 10, 21, 38, 50, 75, 100]) {
      for (let day = 1; day <= 28; day++) {
        useGame.setState({ ...newGameData(), level, day });
        for (const w of ['sunny', 'rain', 'storm'] as const) {
          const ctx = { ...questContext(useGame.getState()), weather: w };
          for (const q of dailyQuests(ctx)) if (!(q.target > 0)) bad.push(`${q.id}@L${level}D${day}${w}=${q.target}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
