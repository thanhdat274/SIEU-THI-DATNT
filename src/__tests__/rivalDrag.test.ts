/**
 * GĐ225 "Đối thủ hút mất bao nhiêu khách/ngày?" — sức hút của rival thành tiền. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { rivalDrag } from '../data/rivalDrag';
import type { Rival } from '../data/biz';

const rival = (strength: number, saleUntil?: number): Rival => ({
  name: 'R', strength, openedDay: 1, ...(saleUntil !== undefined ? { saleUntil } : {}),
});

describe('GĐ225 rivalDrag — đối thủ hút mất bao nhiêu/ngày', () => {
  it('factor = rivalTrafficFactor; khách mất = 1 − factor', () => {
    // strength 40 → factor = 1 − 0.1 = 0.9 → mất 10%
    const d = rivalDrag(rival(40), 5, 1_000_000);
    expect(d.factor).toBeCloseTo(0.9, 5);
    expect(d.lostPct).toBeCloseTo(10, 5);
    expect(d.moneyPerDay).toBe(100_000);
  });

  it('không có rival → không hút khách', () => {
    const d = rivalDrag(null, 5, 1_000_000);
    expect(d.factor).toBe(1);
    expect(d.lostPct).toBe(0);
    expect(d.moneyPerDay).toBe(0);
  });

  it('rival đang giảm giá → hút gấp đôi (onSale)', () => {
    // strength 40, sale → factor = 1 − 0.2×0.25... actually 1 − (40/100)*0.25*2 = 0.8 → mất 20%
    const d = rivalDrag(rival(40, 8), 8, 1_000_000);
    expect(d.onSale).toBe(true);
    expect(d.lostPct).toBeCloseTo(20, 5);
    expect(d.moneyPerDay).toBe(200_000);
  });

  it('doanh thu 0 → tiền mất 0 dù có % hút', () => {
    const d = rivalDrag(rival(60), 5, 0);
    expect(d.lostPct).toBeGreaterThan(0);
    expect(d.moneyPerDay).toBe(0);
  });

  it('rival mạnh (100) bình thường → mất 25% khách; đang xả hàng → đạt sàn 0.5 (mất 50%)', () => {
    const normal = rivalDrag(rival(100), 5, 1_000_000);
    expect(normal.factor).toBeCloseTo(0.75, 5);
    expect(normal.lostPct).toBeCloseTo(25, 5);
    const sale = rivalDrag(rival(100, 9), 9, 1_000_000);
    expect(sale.factor).toBe(0.5);
    expect(sale.lostPct).toBe(50);
  });
});
