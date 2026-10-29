/**
 * GĐ215 "Đơn gọi nhà lời ròng bao nhiêu" — chi phí thật vs doanh thu đơn. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { phoneNetProfit, phoneCostUnit } from '../data/phoneNet';
import type { PhoneOrder } from '../data/phoneOrders';
import { productById } from '../data/products';

// nuoc: buy 4000. vo: buy 15000. banhmi: buy?, trung: buy?, trứng nướng là recipe output.
const priceOf = (id: string) => (id === 'nuoc' ? 6000 : id === 'vo' ? 25000 : 30000);

const order = (items: Record<string, number>, premium?: number): PhoneOrder => ({
  id: 1, houseId: 'nha_1', caller: 'X', reason: 'mua', items, calledAt: 8.5 * 60,
  answerBy: 9 * 60, dueAt: 10 * 60, status: 'ringing', premium,
});

describe('GĐ215 phoneNetProfit — lời ròng đơn gọi nhà', () => {
  it('đơn thường: lời ròng = giá − giá mua nhập × số lượng', () => {
    const n = phoneNetProfit(order({ nuoc: 10 }), priceOf);
    expect(n.gross).toBe(10 * 6000);
    expect(n.cost).toBe(10 * 4000);
    expect(n.net).toBe(20000);
    expect(n.marginRatio).toBeCloseTo((60000 - 40000) / 60000, 6);
  });

  it('đơn VIP (premium 1.5): lời ròng theo giá hời', () => {
    const n = phoneNetProfit(order({ vo: 8 }, 1.5), priceOf);
    expect(n.gross).toBe(8 * 25000 * 1.5);
    expect(n.cost).toBe(8 * 15000);
    expect(n.net).toBe(8 * 25000 * 1.5 - 8 * 15000);
    expect(n.net).toBeGreaterThan(0);
  });

  it('đơn nấu: chi phí theo SỐ MẺ nguyên liệu bếp, không theo buy của thành phẩm', () => {
    const r = productById('banh_mi_trung_nuong');
    const n = phoneNetProfit(order({ banh_mi_trung_nuong: 10 }, 1.3), priceOf);
    // gross = 10 × giá 30000 × 1.3; cost = ceil(10/5)=2 mẻ × (banhmi.buy×5 + trung.buy×1)
    expect(n.gross).toBe(10 * 30000 * 1.3);
    const batch = productById('banhmi').buy * 5 + productById('trung').buy * 1;
    expect(n.cost).toBe(2 * batch);
    expect(phoneCostUnit('banh_mi_trung_nuong', 10)).toBe(2 * batch);
  });

  it('đơn rỗng → net 0, không chia zero', () => {
    const n = phoneNetProfit(order({}), priceOf);
    expect(n.gross).toBe(0);
    expect(n.cost).toBe(0);
    expect(n.net).toBe(0);
    expect(n.marginRatio).toBe(0);
  });
});
