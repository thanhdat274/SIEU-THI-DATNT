import { describe, expect, it } from 'vitest';
import { shelfAttention, type ItemHealth } from '../data/analytics';

// GĐ123: mồi "Kệ cần chú ý" ở Sổ đầu ngày — chọn 2–3 món đang gặp rắc rối nhất để
// người chơi cấp cao (nơi bán hàng đã auto) còn việc đáng làm mỗi sáng. Thuần đọc.
function item(over: Partial<ItemHealth>): ItemHealth {
  return {
    id: 'nuoc_mam_hai_san', name: 'Nước mắm', qty30: 50, profit30: 10000, revenue30: 90000,
    profit21: 1000, margin: 0.1, dailyQty: 3, daysLeft: null, spoilShare: 0, lostShare: 0,
    abc: 'B', ...over,
  };
}

describe('shelfAttention (GĐ123)', () => {
  it('trả rỗng khi không món nào gặp rắc rối', () => {
    expect(shelfAttention([item({}), item({ profit21: -1000, qty30: 2 })])).toEqual([]);
  });

  it('sắp cạn hàng đứng đầu (dailyQty>0, daysLeft ≤ 1.5)', () => {
    const r = shelfAttention([item({ id: 'a', name: 'A', profit21: -5000, qty30: 30, daysLeft: 1.2, dailyQty: 4 })]);
    expect(r).toHaveLength(1);
    expect(r[0].icon).toBe('📦');
    expect(r[0].text).toContain('cạn hàng');
    expect(r[0].id).toBe('a');
  });

  it('lỗ 3 tuần kéo dài (profit21 < 0, qty30 > 5) khi không sắp cạn', () => {
    const r = shelfAttention([item({ id: 'b', name: 'B', profit21: -3000, qty30: 20 })]);
    expect(r).toHaveLength(1);
    expect(r[0].icon).toBe('🪦');
    expect(r[0].text).toContain('3 tuần lỗ');
  });

  it('mất thị phần (lostShare > 0.3, qty30 > 5) là bậc cuối', () => {
    const r = shelfAttention([item({ id: 'c', name: 'C', lostShare: 0.5, qty30: 20 })]);
    expect(r).toHaveLength(1);
    expect(r[0].icon).toBe('🚶');
    expect(r[0].text).toContain('không mua được');
  });

  it('một món chỉ trả dòng cấp cao nhất (không lặp dòng cho cùng món)', () => {
    const h = item({ id: 'd', name: 'D', daysLeft: 1.1, dailyQty: 4, profit21: -9000, qty30: 30, lostShare: 0.6 });
    const r = shelfAttention([h]);
    expect(r).toHaveLength(1);
    expect(r[0].icon).toBe('📦'); // sắp cạn thắng dù vừa lỗ vừa mất thị phần
  });

  it('giới hạn số dòng (max, mặc định 3)', () => {
    const many = [
      item({ id: '1', daysLeft: 1, dailyQty: 5 }),
      item({ id: '2', daysLeft: 1, dailyQty: 5 }),
      item({ id: '3', daysLeft: 1, dailyQty: 5 }),
      item({ id: '4', daysLeft: 1, dailyQty: 5 }),
    ];
    expect(shelfAttention(many)).toHaveLength(3);
    expect(shelfAttention(many, 2)).toHaveLength(2);
  });

  it('món bán ít (qty30 ≤ 5) không bị báo lỗ/mất thị phần để tránh nhiễu món mới', () => {
    expect(shelfAttention([item({ id: 'e', profit21: -1000, qty30: 3 }), item({ id: 'f', lostShare: 0.7, qty30: 2 })])).toEqual([]);
  });
});
