import { describe, expect, it } from 'vitest';
import { fitLots, shelfLife } from '../data/freshness';

describe('fitLots — khớp số lô với count (bù/bớt theo chỗ đổi số, hạn ngắn trước)', () => {
  it('bớt từ lô mới nhất trước (takeNewest): giữ lô cận hạn, trừ lô mới hơn', () => {
    // tổng 10, cần 8 → bớt 2; mới nhất là lô life 8 → rút ở đó
    expect(fitLots([{ qty: 5, life: 2 }, { qty: 5, life: 8 }], 8, 'gao')).toEqual([
      { qty: 5, life: 2 },
      { qty: 3, life: 8 },
    ]);
  });

  it('bớt lan qua nhiều lô, loại hẳn lô rút trọn (qty=0) và chỉ giữ lô còn hàng', () => {
    // tổng 10, cần 4 → bớt 6: rút trọn lô 5×life9, còn 1 từ lô 5×life1
    expect(fitLots([{ qty: 5, life: 1 }, { qty: 5, life: 9 }], 4, 'gao')).toEqual([
      { qty: 4, life: 1 },
    ]);
  });

  it('bớt mọi lô khi count nhỏ hơn cả lô cận hạn (chỉ giữ phần còn sống)', () => {
    // tổng 10, cần 2 → bớt 8: rút trọn lô mới (5×20), rút 3 từ lô 5×3 → còn 2×3
    expect(fitLots([{ qty: 5, life: 3 }, { qty: 5, life: 20 }], 2, 'gao')).toEqual([
      { qty: 2, life: 3 },
    ]);
  });

  it('bù thiếu bằng lô mới hạn đầy (shelfLife) khi diff > 0', () => {
    // gao hạn 45 ngày
    expect(fitLots([{ qty: 3, life: 2 }], 8, 'gao')).toEqual([
      { qty: 3, life: 2 },
      { qty: 5, life: shelfLife('gao') },
    ]);
  });

  it('count khớp tổng → không đổi, chỉ sắp hạn ngắn trước', () => {
    const lots = [{ qty: 5, life: 9 }, { qty: 3, life: 2 }];
    // đầu vào lộn xộn → ra xếp theo life tăng
    expect(fitLots(lots, 8, 'gao')).toEqual([
      { qty: 3, life: 2 },
      { qty: 5, life: 9 },
    ]);
    // không làm đổi dữ liệu gốc
    expect(lots).toEqual([{ qty: 5, life: 9 }, { qty: 3, life: 2 }]);
  });

  it('lots undefined + cần hàng (diff > 0) → dựng trọn một lô mới', () => {
    expect(fitLots(undefined, 6, 'rau')).toEqual([{ qty: 6, life: shelfLife('rau') }]);
  });

  it('bỏ lô rỗng (qty 0) khi khớp', () => {
    expect(fitLots([{ qty: 0, life: 1 }, { qty: 4, life: 2 }], 4, 'gao')).toEqual([
      { qty: 4, life: 2 },
    ]);
  });

  it('diff < 0 mà không có productId: không cần shelfLife, vẫn bớt lô mới nhất', () => {
    expect(fitLots([{ qty: 5, life: 1 }, { qty: 5, life: 7 }], 8, null)).toEqual([
      { qty: 5, life: 1 },
      { qty: 3, life: 7 },
    ]);
  });
});
