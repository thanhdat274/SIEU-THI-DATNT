import { describe, expect, it } from 'vitest';
import { priceGap, PRICE_GAP_MIN_TOTAL } from '../data/priceGap';

describe('priceGap', () => {
  it('trả actionable=false khi không có món nào', () => {
    const r = priceGap([]);
    expect(r.actionable).toBe(false);
    expect(r.count).toBe(0);
    expect(r.totalMissedPerDay).toBe(0);
    expect(r.offenders).toHaveLength(0);
  });

  it('gợi ý giữ giá thì không tính là rò rỉ (gao bán chậm, giá = gốc)', () => {
    // sold=2, want=2: món bán trung bình, không nhanh/không chậm, giữ giá → không rò rỉ.
    const r = priceGap([{ id: 'gao', price: 100000, soldPerDay: 2, wantedPerDay: 2 }]);
    expect(r.offenders.find((o) => o.id === 'gao')).toBeUndefined();
    expect(r.count).toBe(0);
    expect(r.actionable).toBe(false);
  });

  it('món bán chạy đang để giá gốc: gợi ý tăng — tính được tiền để hụt/ngày', () => {
    const r = priceGap([{ id: 'gao', price: 100000, soldPerDay: 8, wantedPerDay: 10 }]);
    const o = r.offenders.find((x) => x.id === 'gao');
    expect(o).toBeDefined();
    expect(o!.gainPerDay).toBeGreaterThan(0);
    expect(o!.toPrice).toBeGreaterThan(o!.fromPrice); // gợi ý TĂNG giá
    expect(r.totalMissedPerDay).toBeCloseTo(o!.gainPerDay, 5);
    expect(r.count).toBe(1);
  });

  it('gộp nhiều món rò rỉ thành tổng, xếp người để hụt nhiều nhất lên đầu', () => {
    const r = priceGap([
      { id: 'gao', price: 100000, soldPerDay: 20, wantedPerDay: 22 },   // để hụt nhiều
      { id: 'trung', price: 33000, soldPerDay: 8, wantedPerDay: 10 },   // để hụt ít hơn
    ]);
    expect(r.offenders.length).toBe(2);
    // gao (giá cao, bán mạnh) để hụt nhiều hơn trung
    expect(r.offenders[0].gainPerDay).toBeGreaterThanOrEqual(r.offenders[1].gainPerDay);
    const sum = r.offenders.reduce((n, o) => n + o.gainPerDay, 0);
    expect(r.totalMissedPerDay).toBeCloseTo(sum, 5);
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(PRICE_GAP_MIN_TOTAL).toBeGreaterThan(0);
  });
});
