import { describe, it, expect } from 'vitest';
import { radialPositions } from '../data/radialMenu';

describe('GĐ1535 menu quạt', () => {
  it('đối xứng, nằm phía trên tâm, đúng bán kính', () => {
    const p = radialPositions(4, 72, 160);
    expect(p).toHaveLength(4);
    expect(p[0].x).toBe(-p[3].x);
    for (const q of p) {
      expect(q.y).toBeLessThan(0);
      expect(Math.abs(Math.hypot(q.x, q.y) - 72)).toBeLessThan(1.5);
    }
    expect(radialPositions(1)).toEqual([{ x: 0, y: -72 }]);
    expect(radialPositions(0)).toEqual([]);
  });
});
