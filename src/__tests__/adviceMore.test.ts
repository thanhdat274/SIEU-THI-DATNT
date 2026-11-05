import { describe, expect, it } from 'vitest';
import { missKey, walkoutAdvice, peakHours, peakAdvice, expiryAdvice, expiringSoon, type MissLog } from '../data/advice';

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

  it('walkoutAdvice: giá cao → kèm tỉ lệ khách còn chịu mua + giá thị trường (GĐ1222)', () => {
    // nuoc sell 6000; bày 9000 (ratio 1.5, nhạy 2.6) → keep kẹp 0.1 → ~10% đơn được mua, hạ về ~6.000đ
    const price = walkoutAdvice({ 'price:nuoc': 2 }, {}, () => 9000);
    const t = price[0].text;
    expect(price[0].action).toBe('prices');
    expect(t).toContain('chỉ ~10% đơn được mua');
    expect(t).toContain('hạ về ~6.000đ là đa số mua');
  });

  it('walkoutAdvice: giá bằng/thấp hơn thị trường → KHÔNG kèm tỉ lệ (không nhiễu, keep=1)', () => {
    // 5000 < 6000 → đa số vẫn mua, giữ dòng gọn như cũ
    const price = walkoutAdvice({ 'price:nuoc': 2 }, {}, () => 5000);
    expect(price[0].text).not.toContain('đơn được mua');
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

  it('walkoutAdvice: quá max món lỡ thì chặt đúng max (bỏ phần sau)', () => {
    // 4 món mỗi món lỡ 3 lần ≥ ngưỡng → max=2 chỉ giữ 2 (lỡ nhiều nhất trước)
    const log: MissLog = { 'stock:mi': 3, 'stock:nuoc': 3, 'stock:banhmi': 3, 'stock:tangluc': 3 };
    const a = walkoutAdvice(log, {}, () => 5000, 2);
    expect(a).toHaveLength(2);
  });

  it('walkoutAdvice: mã món không tồn tại trong kho dữ liệu → bỏ qua, không vỡ', () => {
    // món lạ (sai/đã gỡ) đủ ngưỡng lặp: productById undefined → dòng bị continue, không nhắc
    const log: MissLog = { 'stock:mat_hang_da_go': 3, 'stock:mi': 3 };
    const a = walkoutAdvice(log, {}, () => 5000);
    expect(a).toHaveLength(1);
    expect(a[0].action).toBe('order'); // món là mi còn lại, không phải món đã gỡ
    expect(a[0].text).not.toContain('mat_hang_da_go');
  });

  it('peakHours: đủ ≥3 giờ có khách → báo cả giờ vắng nhất (quiet)', () => {
    const h = peakHours({
      8: { customers: 1, revenue: 10 }, 12: { customers: 6, revenue: 100 }, 18: { customers: 4, revenue: 60 },
    });
    expect(h.peak?.hour).toBe(12);
    expect(h.quiet?.hour).toBe(8); // 8 là giờ có khách ít nhất trong các giờ có khách
  });

  it('expiryAdvice: hàng cần lạnh trong kho → nhắc cất tủ mát (nhánh cold)', () => {
    // x_cha_lua (Chả lụa, category cold → needsCold true): kho còn → bày bán + nhắc cất tủ
    const a = expiryAdvice([{ id: 'x_cha_lua', qty: 2, life: 1, inStorage: 2, onShelf: 0 }]);
    expect(a[0].text).toContain('cần lạnh');
    expect(a[0].action).toBe('arrange');
  });

  it('expiringSoon: cùng hạn thì xếp theo số lượng giảm dần (sort tie-break)', () => {
    const lines = expiringSoon({ mi: 4, nuoc: 9 }, { mi: [{ qty: 4, life: 1 }], nuoc: [{ qty: 9, life: 1 }] }, []);
    // cả hai hạn 1; nuoc (9) phải đứng trước mi (4) dù cùng life
    expect(lines[0].id).toBe('nuoc');
    expect(lines).toHaveLength(2);
  });
});
