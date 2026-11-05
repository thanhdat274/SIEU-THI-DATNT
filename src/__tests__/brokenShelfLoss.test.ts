import { describe, expect, it } from 'vitest';
import { brokenShelfLoss } from '../data/brokenShelfLoss';
import type { ItemHealth } from '../data/analytics';
import { productById } from '../data/products';

/** GĐ1273 — soi LỠ BÁN KỆ HỎNG: kệ/tủ broken chặn khách lấy hàng → mất doanh thu (chỉ tốn tiền sửa
 *  đã có maintenancePayoff "chưa tính hàng lỡ bán"). Helper THUẦN đọc furniture.tiers + itemHealthList. */

const H = (id: string, dailyQty: number): ItemHealth =>
  ({ id, dailyQty, qty30: 0, profit30: 0, revenue30: 0, profit21: 0, margin: 0, daysLeft: 1 }) as ItemHealth;

const shelf = (broken: boolean, tiers: { productId: string; count: number }[]) => ({ type: 'shelf' as const, broken, tiers });

describe('brokenShelfLoss — lỡ bán khi kệ hỏng', () => {
  it('kệ hỏng chặn hẳn món chỉ có trên kệ đó → lỡ = dailyQty × giá bán', () => {
    const r = brokenShelfLoss(
      [shelf(true, [{ productId: 'mi', count: 6 }]), shelf(false, [{ productId: 'nuoc', count: 4 }])],
      [H('mi', 10), H('nuoc', 5)],
    );
    expect(r.hasBroken).toBe(true);
    expect(r.lostPerDay).toBe(10 * productById('mi').sell); // 10 × 5000 = 50.000
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].itemNames).toEqual(['Mì gói']);
  });

  it('món còn kệ chạy khác bày → KHÔNG tính là lỡ (khách vẫn mua được thay)', () => {
    const r = brokenShelfLoss(
      [shelf(true, [{ productId: 'mi', count: 3 }]), shelf(false, [{ productId: 'mi', count: 3 }])],
      [H('mi', 10)],
    );
    expect(r.hasBroken).toBe(false);
    expect(r.lostPerDay).toBe(0);
  });

  it('kệ lành (không hỏng) không gây lỡ', () => {
    const r = brokenShelfLoss([shelf(false, [{ productId: 'mi', count: 6 }])], [H('mi', 10)]);
    expect(r.hasBroken).toBe(false);
    expect(r.lostPerDay).toBe(0);
  });

  it('tầng count 0 (kệ hỏng nhưng hết hàng) → không tính', () => {
    const r = brokenShelfLoss([shelf(true, [{ productId: 'mi', count: 0 }])], [H('mi', 10)]);
    expect(r.hasBroken).toBe(false);
    expect(r.lostPerDay).toBe(0);
  });

  it('nhiều kệ hỏng món khác nhau → gộp tổng, mỗi món tính một lần', () => {
    const r = brokenShelfLoss(
      [shelf(true, [{ productId: 'mi', count: 6 }]), shelf(true, [{ productId: 'nuoc', count: 4 }])],
      [H('mi', 10), H('nuoc', 5)],
    );
    expect(r.lines).toHaveLength(2);
    expect(r.lostPerDay).toBe(10 * productById('mi').sell + 5 * productById('nuoc').sell);
  });

  it('chưa có sổ bán (dailyQty 0) → vẫn báo món, nhưng lỡ = 0 (không bịa số)', () => {
    const r = brokenShelfLoss([shelf(true, [{ productId: 'mi', count: 6 }])], [H('mi', 0)]);
    expect(r.hasBroken).toBe(true);
    expect(r.lines[0].itemNames).toEqual(['Mì gói']);
    expect(r.lostPerDay).toBe(0);
  });

  it('thuần — cùng đầu vào cho cùng kết quả (không RNG)', () => {
    const f = [shelf(true, [{ productId: 'mi', count: 6 }])];
    const hs = [H('mi', 10)];
    expect(brokenShelfLoss(f, hs)).toEqual(brokenShelfLoss(f, hs));
  });
});
