import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS, offerForDay } from '../data/orders';
import { productById } from '../data/products';

// GĐ1709 — đơn mâm cỗ giỗ đặt gà xào sả.
describe('GĐ1709 — đơn cỗ giỗ gà xào sả', () => {
  const o = PARTY_ORDERS.find((x) => x.id === 'gio_ga_xao_sa')!;
  it('đặt gà xào sả, mở không sớm hơn món, có thưởng', () => {
    expect(o.items).toEqual({ ga_xao_sa: 16 });
    expect(o.unlock).toBeGreaterThanOrEqual(productById('ga_xao_sa').unlock);
    expect(o.bonus).toBeGreaterThan(0);
  });
  it('quét seed × ngày ở cấp 60: đơn xuất hiện ≥1 lần', () => {
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 60, {})?.id === 'gio_ga_xao_sa') n++;
    expect(n).toBeGreaterThan(0);
  });
});
