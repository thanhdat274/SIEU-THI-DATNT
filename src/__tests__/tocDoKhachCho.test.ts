import { describe, it, expect } from 'vitest';
import { useGame } from '../core/store';

describe('Review 13/11-3 R9 — hạ tốc độ khi khách xếp hàng', () => {
  const run = (level: number, waiting: number) => {
    useGame.setState({ level, speed: 8, shopOpen: true, waiting, minutes: 600 });
    useGame.getState().tick(0.01);
    return useGame.getState().speed;
  };
  it('cấp >30, ≥4 khách chờ → 3×', () => expect(run(35, 5)).toBe(3));
  it('ít khách chờ → giữ tốc độ', () => expect(run(35, 2)).toBe(8));
  it('cấp ≤30 → không đổi (giữ golden)', () => expect(run(20, 9)).toBe(8));
});
