import { describe, expect, it } from 'vitest';
import { describeOnline, onlineValue, deliveryStars, VERY_LATE, type OnlineOrder } from '../data/online';

/** Dựng đơn app tối thiểu với giỏ hàng chỉ định. */
const order = (items: Record<string, number>, patch: Partial<OnlineOrder> = {}): OnlineOrder => ({
  id: 1, customer: 'Khách app', items, km: 1, placedAt: 720, dueAt: 900, status: 'new', ...patch,
});

describe('describeOnline — mô tả giỏ hàng đơn app', () => {
  it('một món → "q Tên"', () => {
    // nuoc = Nước suối
    expect(describeOnline(order({ nuoc: 2 }))).toBe('2 Nước suối');
  });

  it('nhiều món → nối bằng ", " theo thứ tự giỏ', () => {
    expect(describeOnline(order({ mi: 3, nuoc: 1 }))).toBe('3 Mì gói, 1 Nước suối');
  });

  it('giỏ rỗng → chuỗi rỗng', () => {
    expect(describeOnline(order({}))).toBe('');
  });
});

describe('onlineValue & deliveryStars — số sao theo giờ tới (lệch thời gian)', () => {
  it('onlineValue nhân đúng giá bán từng món', () => {
    const priceOf = (id: string) => (id === 'mi' ? 5000 : id === 'nuoc' ? 6000 : 0);
    expect(onlineValue(order({ mi: 3, nuoc: 2 }), priceOf)).toBe(3 * 5000 + 2 * 6000);
  });

  it('deliveryStars: đúng hẹn 5★ · trễ trong dung sai 3★ · trễ quá → 1★', () => {
    expect(deliveryStars(order({}), 900)).toBe(5);                    // đúng dueAt → 5★
    expect(deliveryStars(order({}), 900 + VERY_LATE - 1)).toBe(3);    // trễ nhưng trong dung sai → 3★
    expect(deliveryStars(order({}), 900 + VERY_LATE)).toBe(3);        // tại ngưỡng vẫn 3★
    expect(deliveryStars(order({}), 900 + VERY_LATE + 1)).toBe(1);    // trễ quá ngưỡng → 1★
  });
});
