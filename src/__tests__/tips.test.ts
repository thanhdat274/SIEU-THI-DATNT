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

describe('GĐ1569 mẹo máy', () => {
  it('có mẹo lễ hội cấp 50 và tăng dần không bắt buộc', async () => {
    const { TIPS, tipAt } = await import('../data/tips');
    expect(TIPS.some((t) => t.from === 50 && t.text.includes('lễ hội'))).toBe(true);
    expect(typeof tipAt(1, 1, 0)).toBe('string');
  });
});

describe('GĐ1582 mẹo khen sàn sạch', () => {
  it('cấp 35', async () => {
    const { TIPS } = await import('../data/tips');
    expect(TIPS.some((t) => t.from === 35 && t.text.includes('+50 XP'))).toBe(true);
  });
});

describe('GĐ1585 mẹo nhiệm vụ tặng quà', () => {
  it('cấp 38', async () => {
    const { TIPS } = await import('../data/tips');
    expect(TIPS.some((t) => t.from === 38 && t.text.includes('tặng quà khách quen 2 lần'))).toBe(true);
  });
});

describe('GĐ1589 mẹo quà sinh nhật', () => {
  it('cấp 38', async () => {
    const { TIPS } = await import('../data/tips');
    expect(TIPS.some((t) => t.from === 38 && t.text.includes('+30 XP'))).toBe(true);
  });
});

describe('GĐ1594 mẹo gắp trúng có chỗ xem', () => {
  it('cấp 44', async () => {
    const { TIPS } = await import('../data/tips');
    expect(TIPS.some((t) => t.from === 44 && t.text.includes('tab Dịch vụ'))).toBe(true);
  });
});
