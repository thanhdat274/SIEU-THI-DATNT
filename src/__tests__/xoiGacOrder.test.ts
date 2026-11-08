import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS } from '../data/orders';
import { productById } from '../data/products';

// GĐ1678 — đơn mâm xôi gấc đám cưới: lối bán lớn cho xôi gấc.
describe('GĐ1678 — đơn xôi gấc đám cưới', () => {
  it('có đơn, đặt xôi gấc, mở không sớm hơn món', () => {
    const o = PARTY_ORDERS.find((x) => x.id === 'xoi_gac_cuoi')!;
    expect(o.items).toEqual({ xoi_gac: 30 });
    expect(o.unlock).toBeGreaterThanOrEqual(productById('xoi_gac').unlock);
    expect(o.bonus).toBeGreaterThan(0);
  });
});

describe('GĐ1678 — đơn xôi gấc thật sự được mời ở cấp đủ', () => {
  it('quét seed × ngày ở cấp 50: đơn xoi_gac_cuoi xuất hiện ≥1 lần', async () => {
    const { offerForDay } = await import('../data/orders');
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 50, {})?.id === 'xoi_gac_cuoi') n++;
    expect(n).toBeGreaterThan(0);
  });
});
