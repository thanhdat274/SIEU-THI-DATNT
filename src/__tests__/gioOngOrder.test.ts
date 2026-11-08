import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS, offerForDay } from '../data/orders';
import { RECIPES } from '../data/recipes';

// GĐ1788 — đơn "Đám giỗ ông": mâm cơm nhà 2 món (thịt kho trứng + canh chua cá).
describe('đơn dam_gio_ong (GĐ1788)', () => {
  const o = PARTY_ORDERS.find((x) => x.id === 'dam_gio_ong')!;
  it('2 món nấu, mở không sớm hơn món, có thưởng', () => {
    expect(Object.keys(o.items).sort()).toEqual(['canh_chua_ca', 'thit_kho_trung']);
    for (const id of Object.keys(o.items)) {
      const r = RECIPES.find((x) => x.outputId === id)!;
      expect(r).toBeTruthy();
      expect(o.unlock).toBeGreaterThanOrEqual(r.unlock);
    }
    expect(o.bonus).toBeGreaterThan(0);
  });
  it('quét 30 seed × 140 ngày ở cấp 60: xuất hiện ≥1 lần', () => {
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 60, {})?.id === 'dam_gio_ong') n++;
    expect(n).toBeGreaterThanOrEqual(1);
  });
});
