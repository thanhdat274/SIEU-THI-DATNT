import { describe, it, expect } from 'vitest';
import { xpGainDelta } from '../data/xpGain';

describe('GĐ1529 +N XP', () => {
  it('chỉ hiện phần tăng, sang ngày (reset) không âm', () => {
    expect(xpGainDelta(10, 40)).toBe(30);
    expect(xpGainDelta(40, 0)).toBe(0);
    expect(xpGainDelta(5, 5)).toBe(0);
  });
});
