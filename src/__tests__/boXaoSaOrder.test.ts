import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS } from '../data/orders';
import { productById } from '../data/products';

// GĐ1720 — đơn đám hỏi bò xào sả: mở cùng cấp món, món có thật.
describe('đơn đám hỏi bò xào sả (GĐ1720)', () => {
  it('tồn tại, mở 54, món mở không muộn hơn đơn', () => {
    const o = PARTY_ORDERS.find((x) => x.id === 'cuoi_bo_xao_sa')!;
    expect(o.unlock).toBe(54);
    for (const id of Object.keys(o.items)) expect(productById(id).unlock).toBeLessThanOrEqual(o.unlock);
  });
});
