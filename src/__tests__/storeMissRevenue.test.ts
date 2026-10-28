import { describe, expect, it } from 'vitest';
import { storeMissRevenue } from '../data/advice';

/**
 * GĐ131 — Định lượng lãi bỏ lỡ vì kệ/kho hết hàng ở tiệm CHÍNH: quy mọi missLog['stock:<id>']
 * ra (sell − buy) × count. THUẦN đọc — không đổi save/kinh tế.
 */

describe('storeMissRevenue — lãi bỏ lỡ vì hết hàng', () => {
  it('không có missLog → null (ẩn, không nhiễu)', () => {
    expect(storeMissRevenue(undefined, {})).toBeNull();
    expect(storeMissRevenue({}, {})).toBeNull();
    expect(storeMissRevenue({ wait: 3 }, {})).toBeNull(); // chỉ chờ quầy thì không phải hết hàng
  });

  it('quy đổi đúng count × (sell − buy)', () => {
    const r = storeMissRevenue({ 'stock:mi': 4 }, {})!;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ id: 'mi', count: 4, estLoss: (5000 - 3000) * 4 });
    expect(r.totalLoss).toBe(8000);
  });

  it('nhiều món cộng dồn, sắp theo tổn thất giảm dần', () => {
    // mi: (5000−3000)=2000; nuoc: (6000−4000)=2000
    const r = storeMissRevenue({ 'stock:nuoc': 10, 'stock:mi': 2 }, {})!;
    expect(r.totalLoss).toBe(10 * 2000 + 2 * 2000);
    expect(r.rows[0].id).toBe('nuoc'); // 20000 > 4000
    expect(r.rows[1].id).toBe('mi');
  });

  it('bỏ qua key không phải stock (wait/price) và id không tồn tại', () => {
    const r = storeMissRevenue({ 'stock:mi': 2, 'wait:': 5, 'price:mi': 1, 'stock:xyz_khong_co': 9 }, {})!;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].id).toBe('mi');
  });

  it('phân biệt còn trong kho (kệ hết chỗ) vs hết cả kho', () => {
    const r = storeMissRevenue({ 'stock:mi': 2, 'stock:nuoc': 3 }, { mi: 5 })!;
    expect(r.inStorageCount).toBe(1); // mi còn 5 trong kho
    expect(r.outOfStockCount).toBe(1); // nuoc không còn
    expect(r.rows.find((x) => x.id === 'mi')!.inStorage).toBe(5);
    expect(r.rows.find((x) => x.id === 'nuoc')!.inStorage).toBe(0);
  });

  it('inStorageCount=0 / outOfStockCount đúng khi toàn bộ hết kho', () => {
    const r = storeMissRevenue({ 'stock:mi': 1, 'stock:nuoc': 1 }, {})!;
    expect(r.inStorageCount).toBe(0);
    expect(r.outOfStockCount).toBe(2);
  });

  it('an toàn: missLog từ save cũ thiếu trường không sập, productById bỏ qua id lạ', () => {
    const r = storeMissRevenue({ 'stock:khong_co_id': 3 }, {})!;
    expect(r).toBeNull(); // không có món nào hợp lệ
  });
});
