import { describe, expect, it } from 'vitest';
import { DEVICES, guessDevice, guideFor } from '../data/guide';

describe('hướng dẫn', () => {
  it('thiết bị nào cũng có đủ nhóm, bước có chữ', () => {
    for (const [d] of DEVICES) {
      const g = guideFor(d);
      expect(g.length).toBeGreaterThanOrEqual(6);
      for (const s of g) for (const st of s.steps) expect(st.title && st.text && st.icon).toBeTruthy();
    }
  });
  it('đoán thiết bị', () => {
    expect(guessDevice(1200, false)).toBe('pc');
    expect(guessDevice(400, true)).toBe('phone');
    expect(guessDevice(900, true)).toBe('tablet');
  });
});

import { LANDING, shouldShowLanding } from '../data/guide';
describe('giới thiệu game', () => {
  it('đủ chữ, có nút vào chơi', () => {
    expect(LANDING.tagline && LANDING.cta).toBeTruthy();
    expect(LANDING.intro.length).toBeGreaterThanOrEqual(1);
    expect(LANDING.points.length).toBeGreaterThanOrEqual(4);
    for (const p of LANDING.points) expect(p.icon && p.title && p.text).toBeTruthy();
  });
  it('chỉ hiện cho người mới chưa xem', () => {
    expect(shouldShowLanding(false, false)).toBe(true);
    expect(shouldShowLanding(true, false)).toBe(false);
    expect(shouldShowLanding(false, true)).toBe(false);
  });
});
