import { describe, expect, it } from 'vitest';
import {
  MARKET_MAX,
  MARKET_MAX_STEP,
  MARKET_MIN,
  demandMul,
  marketTrend,
  nextMarketIndex,
  scarcityMul,
  type MarketTrendDir,
} from '../data/market';

describe('marketTrend — hướng trôi đà giá thị trường (GĐ41)', () => {
  it('đồng nhất với nextMarketIndex: next == nextMarketIndex cùng đầu vào', () => {
    for (const [prev, onHand, demand] of [[1, 0, 0], [1.2, 5, 3], [0.85, 100, 1], [1.05, 30, 5], [MARKET_MAX, 70, 0]] as const) {
      const t = marketTrend(prev, onHand, 0, demand);
      expect(t.next).toBe(nextMarketIndex(prev, onHand, 0, demand));
      expect(t.drift).toBeCloseTo(t.next - prev, 3);
    }
  });

  it('khan hiếm (cạn hàng) → đà lên + scarcity=scarce', () => {
    // prev thấp, onHand 0 → scarcity 1.08, demand 5 → đà hướng lên
    const t = marketTrend(0.8, 0, 0, 5);
    expect(t.scarcity).toBe('scarce');
    expect(t.dir).toBe('up');
    expect(t.next).toBeGreaterThan(0.8);
  });

  it('tồn nhiều (≥60) + cầu thấp → đà xuống + scarcity=oversupply', () => {
    const t = marketTrend(1.3, 70, 0, 0);
    expect(t.scarcity).toBe('oversupply');
    expect(t.dir).toBe('down');
    expect(t.next).toBeLessThan(1.3);
  });

  it('hàng vừa phải, cầu yếu → cân bằng (steady)', () => {
    const t = marketTrend(1, 30, 0, 0.5);
    expect(t.scarcity).toBe('steady');
  });

  it('đang ở đúng mục tiêu → flat (không trôi đáng kể)', () => {
    // onHand 30 → scarcityMul=1; demand 2.5 → demandMul=0.95+0.5*0.15=1.025; target=1.025
    const target = scarcityMul(30, 0) * demandMul(2.5);
    const t = marketTrend(target, 30, 0, 2.5);
    expect(t.dir).toBe('flat');
    expect(t.drift).toBe(0);
  });

  it('bị chặn tại trần/đáy: next không vượt MARKET_MAX/MIN và trôi ≤ MAX_STEP', () => {
    const up = marketTrend(MARKET_MAX, 0, 0, 5);
    expect(up.next).toBeLessThanOrEqual(MARKET_MAX);
    const dn = marketTrend(MARKET_MIN, 100, 0, 0);
    expect(dn.next).toBeGreaterThanOrEqual(MARKET_MIN);
    expect(Math.abs(up.drift)).toBeLessThanOrEqual(MARKET_MAX_STEP + 0.0005);
    expect(Math.abs(dn.drift)).toBeLessThanOrEqual(MARKET_MAX_STEP + 0.0005);
  });

  it('cầu cao giữ đà hướng lên mạnh hơn cầu thấp (cùng trạng thái hàng)', () => {
    // onHand 5 → scarcity 1.04; prev 1.05 → target(nhu cầu 5) > target(nhu cầu 0)
    const high = marketTrend(1.05, 5, 0, 5);
    const low = marketTrend(1.05, 5, 0, 0);
    expect(high.next).toBeGreaterThan(low.next);
  });

  it('quét dải onHand 0..80: có lúc khan lên / thừa xuống, mọi dir hợp lệ', () => {
    const prev = 1;
    let sawUp = false;
    let sawDown = false;
    for (let h = 0; h <= 80; h++) {
      const t = marketTrend(prev, h, 0, 0);
      expect(['up', 'down', 'flat']).toContain(t.dir);
      expect(t.drift).toBeCloseTo(t.next - prev, 3);
      if (t.dir === 'up') sawUp = true;
      if (t.dir === 'down') sawDown = true;
    }
    // Trên cùng prev=1, demand 0: dải 0..80 phải có lúc lên (khan) và lúc xuống (thừa);
    // 'flat' hiếm (chỉ khi đúng mục tiêu) nên có test riêng bên trên.
    expect(sawUp).toBe(true);
    expect(sawDown).toBe(true);
  });

  it('không trạng thái, không đổi hằng số kinh tế', () => {
    // Helper thuần: chạy 2 lần cùng đầu vào → kết quả giống hệt (không dùng Math.random/state)
    const a = marketTrend(1.1, 8, 0, 3);
    const b = marketTrend(1.1, 8, 0, 3);
    expect(a).toEqual(b);
    expect(MARKET_MIN).toBe(0.8);
    expect(MARKET_MAX).toBe(1.4);
  });
});

describe('dir hợp lệ cho mọi tổ hợp ranh giới', () => {
  it('mọi dir thuộc 3 giá trị hợp lệ + có đủ lên/xuống khi quét cấu hình', () => {
    const dirs = new Set<MarketTrendDir>();
    for (const prev of [0.8, 1, 1.4]) {
      for (const onHand of [0, 5, 30, 70]) {
        for (const demand of [0, 2, 5]) {
          const dir = marketTrend(prev, onHand, 0, demand).dir;
          expect(['up', 'down', 'flat']).toContain(dir);
          dirs.add(dir);
        }
      }
    }
    expect(dirs.has('up')).toBe(true);
    expect(dirs.has('down')).toBe(true);
  });
});
