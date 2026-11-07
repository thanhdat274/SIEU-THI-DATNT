import { describe, it, expect } from 'vitest';
import { sellMasteryTier, masteryUps } from '../data/sellMastery';

describe('GĐ1553 — thông thạo món bán', () => {
  it('bậc theo 200/1000/4000', () => {
    expect(sellMasteryTier(199)).toBe(0);
    expect(sellMasteryTier(200)).toBe(1);
    expect(sellMasteryTier(1000)).toBe(2);
    expect(sellMasteryTier(4000)).toBe(3);
  });
  it('chỉ báo món vừa vượt ngưỡng', () => {
    expect(masteryUps({ mi: 199, nuoc: 50 }, { mi: 201, nuoc: 51 })).toEqual([['mi', 1]]);
    expect(masteryUps({ mi: 201 }, { mi: 202 })).toEqual([]);
  });
});

describe('GĐ1554 — huy hiệu thông thạo ở kệ', () => {
  it('chỉ hiện từ cấp 36 khi đã có bậc', async () => {
    const { masteryBadge } = await import('../data/sellMastery');
    expect(masteryBadge(36, 1000)).toBe(' · 🥈 1.000/4.000'); // GĐ1576 kèm tiến độ
    expect(masteryBadge(36, 5000)).toBe(' · 🥇');
    expect(masteryBadge(35, 1000)).toBe('');
    expect(masteryBadge(40, 10)).toBe('');
  });
});

import { masteryXp } from '../data/sellMastery';
import { useGame as G1575 } from '../core/store';
describe('GĐ1575 XP lên bậc thông thạo', () => {
  it('bảng XP', () => {
    expect([masteryXp(1), masteryXp(2), masteryXp(3), masteryXp(0)]).toEqual([20, 60, 150, 0]);
  });
  it('store: vượt 200 lần bán ở cấp 36 cộng XP', () => {
    const st = G1575.getState();
    G1575.setState({ level: 36, soldEver: { mi: 199 }, biz: { ...st.biz, discoveryClaimed: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000] } });
    const xp0 = G1575.getState().xp, lv0 = G1575.getState().level;
    G1575.getState().recordDiscovery(['mi']);
    const s = G1575.getState();
    expect(s.soldEver.mi).toBe(200);
    expect(s.level > lv0 || s.xp - xp0 === 20).toBe(true);
  });
});
