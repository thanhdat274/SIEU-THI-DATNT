import { describe, expect, it } from 'vitest';
import { lampLevel, lampLevelAt } from '../render/lampLevel';
import { warmGlow } from '../world/compoundWarm';
import { lanternGlow } from '../world/storefrontLantern';

describe('GĐ966 — lampLevel', () => {
  it('tắt ban ngày, sáng hẳn ban đêm', () => {
    expect(lampLevel(12)).toBe(0);
    expect(lampLevel(6)).toBe(0);
    expect(lampLevel(17)).toBe(0);
    expect(lampLevel(18)).toBe(1);
    expect(lampLevel(23)).toBe(1);
    expect(lampLevel(3)).toBe(1);
    expect(lampLevel(5.5)).toBe(0);
  });
  it('đèn ấm và lồng dùng chung công thức, an toàn với phút âm / quá 24h', () => {
    for (const mins of [-60, 0, 330, 360, 720, 1020, 1100, 1380, 1500, 2900]) {
      expect(warmGlow(mins)).toBe(lampLevelAt(mins));
      expect(lanternGlow(mins)).toBe(lampLevelAt(mins));
    }
    expect(lampLevelAt(-60)).toBe(1);
  });
});
