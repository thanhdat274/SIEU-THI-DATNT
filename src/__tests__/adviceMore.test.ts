import { describe, expect, it } from 'vitest';
import { missKey, walkoutAdvice, peakHours, peakAdvice, expiryAdvice, type MissLog } from '../data/advice';

/**
 * GĐ210 — QA toàn diện: bổ sung test cho các hàm gợi ý trong advice.ts còn thiếu
 * (walkoutAdvice, peakHours/peakAdvice, expiryAdvice, missKey) — giúp nâng độ phủ phần "dạy chơi".
 */
describe('advice — các gợi ý việc nên làm', () => {
  it('missKey: gộp mã theo nguyên nhân + mã món', () => {
    expect(missKey('stock', 'mi')).toBe('stock:mi');
    expect(missKey('wait')).toBe('wait:');
    expect(missKey('price', 'nuoc')).toBe('price:nuoc');
  });

  it('walkoutAdvice: kệ trống mà kho còn → bày thêm (arrange)', () => {
    const log: MissLog = { 'stock:mi': 3 };
    const a = walkoutAdvice(log, { mi: 5 }, () => 5000);
    expect(a[0].action).toBe('arrange');
    expect(a[0].text).toContain('kho còn 5');
  });

  it('walkoutAdvice: hết cả kho → nhập thêm (order)', () => {
    const log: MissLog = { 'stock:mi': 3 };
    const a = walkoutAdvice(log, {}, () => 5000);
    expect(a[0].action).toBe('order');
  });

  it('walkoutAdvice: chờ quầy lâu → thuê người (staff); chê đắt → chỉnh giá (prices)', () => {
    expect(walkoutAdvice({ wait: 5 }, {}, () => 5000)[0].action).toBe('staff');
    const price = walkoutAdvice({ 'price:nuoc': 2 }, {}, () => 5000);
    expect(price[0].action).toBe('prices');
  });

  it('walkoutAdvice: món lỡ ít (< ngưỡng lặp) thì không nhắc', () => {
    expect(walkoutAdvice({ 'stock:mi': 1 }, {}, () => 5000)).toEqual([]);
  });

  it('peakHours: tìm giờ đông nhất; chưa đủ giờ vắng thì không báo', () => {
    const h = peakHours({ 12: { customers: 5, revenue: 100 }, 13: { customers: 2, revenue: 30 } });
    expect(h.peak?.hour).toBe(12);
    expect(h.quiet).toBeUndefined(); // chỉ 2 giờ có khách < 3
  });

  it('peakAdvice: đông + có khách bỏ về vì chờ → xếp ca (staff)', () => {
    const p = peakHours({ 12: { customers: 5, revenue: 100 } }).peak!;
    const a = peakAdvice(p, 3);
    expect(a[0].action).toBe('staff');
    expect(a[0].text).toContain('12h');
  });

  it('peakAdvice: đông mà không ai chờ → châm kệ (arrange); ít khách → không gợi ý', () => {
    const p = peakHours({ 12: { customers: 6, revenue: 100 } }).peak!;
    expect(peakAdvice(p, 0)[0].action).toBe('arrange');
    expect(peakAdvice({ hour: 12, customers: 2, revenue: 10 }, 5)).toEqual([]);
  });

  it('expiryAdvice: hàng trong kho → bày bán trước (arrange)', () => {
    const a = expiryAdvice([{ id: 'mi', qty: 2, life: 1, inStorage: 1, onShelf: 0 }]);
    expect(a[0].action).toBe('arrange');
    expect(a[0].text).toContain('hỏng trong đêm nay');
  });

  it('expiryAdvice: hết kho chỉ còn kệ → hạ giá (prices)', () => {
    const a = expiryAdvice([{ id: 'mi', qty: 2, life: 2, inStorage: 0, onShelf: 2 }]);
    expect(a[0].action).toBe('prices');
    expect(a[0].text).toContain('còn 2 ngày');
  });
});
