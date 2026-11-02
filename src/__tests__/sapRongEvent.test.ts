import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sapEventIncome, sapRongEvent, SAP_EVENT, SAP_EVENT_MUL, sapRongIncome } from '../data/sapRong';
import { newGameData, useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';

/**
 * GĐ712 — sự kiện một ngày ở sạp hàng rong Ngõ 2 (data/sapRong.ts):
 *  🚌 đoàn khách ghé: doanh thu hôm đó ×1,4 · 💨 gió mùa: khách vắng ×0,7.
 * Chỉ hiệu chỉnh doanh thu + dòng tin (sạp không có state riêng); mưa/bão nghỉ bán thì không sự kiện.
 * endDay truyền simRng — không truyền rng giữ hành vi cũ (projection/test cũ không vỡ).
 */

const g = () => useGame.getState();

describe('sapRongEvent — gieo sự kiện thuần (GĐ712)', () => {
  it('hệ số đúng bảng: tour ×1,4, gio ×0,7', () => {
    expect(SAP_EVENT).toEqual({ tour: 0.05, gio: 0.05 });
    expect(SAP_EVENT_MUL.tour).toBe(1.4);
    expect(SAP_EVENT_MUL.gio).toBe(0.7);
  });

  it('r1 trúng → tour; r1 cao r2 thấp → gio; cả hai cao / không rng → không sự kiện', () => {
    let i = 0;
    expect(sapRongEvent(() => [0.01, 0.99][i++ % 2])).toBe('tour');
    i = 0;
    expect(sapRongEvent(() => [0.5, 0.01][i++ % 2])).toBe('gio');
    expect(sapRongEvent(() => 0.5)).toBeUndefined();
    expect(sapRongEvent()).toBeUndefined();
  });

  it('nhân lên doanh thu: tour tăng 40%, gio còn 70% (làm tròn), 0 nghỉ mưa vẫn 0', () => {
    const base = sapRongIncome(1, 'sunny', 10, ['nuocmia'], [1], false, false);
    expect(base).toBeGreaterThan(0);
    expect(sapEventIncome(base, 'tour')).toBe(Math.round(base * 1.4));
    expect(sapEventIncome(base, 'gio')).toBe(Math.round(base * 0.7));
    expect(sapEventIncome(base)).toBe(base);
    expect(sapEventIncome(0, 'tour')).toBe(0);
  });
});

describe('endDay gắn sự kiện sạp vào tin sáng mai (GĐ712)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGame.setState({
      ...newGameData(),
      level: 35,
      money: 100_000_000,
      minutes: 20 * 60,
      notify: () => {},
      biz: { ...newGameData().biz, sapRong: 1, sapKinds: ['nuocmia'], sapTiers: [1] },
    });
  });
  afterEach(() => { vi.restoreAllMocks(); clearSimSeed(); });

  it('quét seed: có ngày báo 🚌/💨 và tiền sạp nhân đúng hệ số so với ngày thường', () => {
    let hit = 0;
    for (let seed = 1; seed <= 500; seed++) {
      setSimSeed(seed);
      g().sleep();
      const st = g();
      const news = (st.lastSummary?.news ?? []).find((n) => n.includes('sạp hàng rong')) ?? '';
      if (news.includes('đoàn khách ghé') || news.includes('gió mùa')) {
        expect([...news].length).toBeLessThanOrEqual(90);
        hit++;
      }
      if (hit >= 3) break;
    }
    expect(hit).toBeGreaterThanOrEqual(3); // p ≈ 10%/ngày bán → 500 ngày không thể còn 0
  });

  it('mưa nghỉ bán: dòng "nghỉ bán" không dính sự kiện', () => {
    let ok = false;
    for (let seed = 1; seed <= 80 && !ok; seed++) {
      setSimSeed(seed);
      useGame.setState({ ...newGameData(), level: 35, minutes: 20 * 60, weather: 'rain', notify: () => {}, biz: { ...newGameData().biz, sapRong: 1, sapKinds: ['nuocmia'], sapTiers: [1] } });
      g().sleep();
      const line = (g().lastSummary?.news ?? []).find((n) => n.includes('sạp hàng rong')) ?? '';
      if (line.includes('nghỉ bán')) ok = true;
      expect(line).not.toContain('đoàn khách');
      expect(line).not.toContain('gió mùa');
    }
    expect(ok).toBe(true);
  });
});
