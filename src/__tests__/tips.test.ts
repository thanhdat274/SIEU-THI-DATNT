import { describe, it, expect } from 'vitest';
import { TIPS, tipAt } from '../data/tips';

describe('GĐ1552 — Bạn có biết?', () => {
  it('chỉ hiện mẹo đã mở ở cấp hiện tại', () => {
    const early = new Set(TIPS.filter((t) => t.from <= 1).map((t) => t.text));
    for (let m = 0; m < 1440; m += 30) expect(early.has(tipAt(1, 3, m))).toBe(true);
  });
  it('đổi mẹo theo khung 30 phút, ổn định trong khung', () => {
    expect(tipAt(50, 2, 600)).toBe(tipAt(50, 2, 629));
    expect(tipAt(50, 2, 600)).not.toBe(tipAt(50, 2, 630));
  });
});

describe('GĐ1562 mẹo tặng quà khách quen', () => {
  it('mở ở cấp 38', async () => {
    const { TIPS } = await import('../data/tips');
    expect(TIPS.some((t) => t.from === 38 && t.text.includes('khách quen'))).toBe(true);
  });
});
