import { describe, expect, it } from 'vitest';
import { formatMoney } from '../data/products';
import { todayLine, todayMissedLine, todayPeakLine } from '../data/todayScore';

describe('todayLine — bề mặt "hôm nay bán được chưa?" (GĐ1226)', () => {
  it('chưa có gì (mới mở cửa) → chuỗi rỗng (đừng ồn đầu ngày)', () => {
    expect(todayLine({ customers: 0, itemsSold: 0, revenue: 0 })).toBe('');
  });
  it('có khách lẻ → gom đủ 3 số: khách · món · doanh thu cộng dồn', () => {
    const out = todayLine({ customers: 3, itemsSold: 2, revenue: 15000 });
    expect(out).toContain('3 khách');
    expect(out).toContain('2 món');
    expect(out).toContain(`thu ${formatMoney(15000)}`);
  });
  it('chỉ bán online (khách 0, món >0, thu >0) vẫn báo — doanh thu là tổng kênh', () => {
    const out = todayLine({ customers: 0, itemsSold: 5, revenue: 80000 });
    expect(out).toContain('0 khách'); // khách quầy 0, nhưng món/doanh thu đã có
    expect(out).toContain('5 món');
    expect(out).toContain('thu');
  });
  it('helper thuần: cùng input ra cùng chuỗi (không đổi theo state)', () => {
    const a = todayLine({ customers: 7, itemsSold: 4, revenue: 42000 });
    const b = todayLine({ customers: 7, itemsSold: 4, revenue: 42000 });
    expect(a).toBe(b);
  });
});

describe('todayPeakLine — bề mặt "giờ cao điểm đến giờ" (GĐ1227)', () => {
  it('chưa có khách (byHour trống/undefined) → chuỗi rỗng (đầu ngày đừng ồn)', () => {
    expect(todayPeakLine(undefined)).toBe('');
    expect(todayPeakLine({})).toBe('');
  });
  it('đỉnh chưa tới ngưỡng 4 khách (chỉ lẻ tẻ) → rỗng, không nhiễu', () => {
    // giờ 12 có 3 khách < 4 → chưa coi là "cao điểm", tránh báo sớm nhảm
    expect(todayPeakLine({ 12: { customers: 3, revenue: 9000 } })).toBe('');
  });
  it('có khung đông (≥4 khách) → trỏ đúng giờ đỉnh trong ngày tính tới giờ', () => {
    const out = todayPeakLine({
      10: { customers: 2, revenue: 5000 },
      12: { customers: 6, revenue: 15000 },
      13: { customers: 8, revenue: 21000 },
    });
    expect(out).toContain('13h–14h'); // đông nhất = giờ 13 (8 khách)
    expect(out).toContain('8 khách');
  });
  it('lấp giờ trống giữa ngày vẫn chọn đỉnh đúng (không lệch do lỗ hổng giờ)', () => {
    const out = todayPeakLine({ 9: { customers: 5, revenue: 10000 }, 14: { customers: 4, revenue: 8000 } });
    expect(out).toContain('9h–10h');
    expect(out).toContain('5 khách');
  });
  it('helper thuần: cùng input ra cùng chuỗi', () => {
    const h = { 12: { customers: 6, revenue: 15000 } };
    expect(todayPeakLine(h)).toBe(todayPeakLine(h));
  });
});

describe('todayMissedLine — bề mặt "khách bỏ về hôm nay" giữa ngày (GĐ1228)', () => {
  it('chưa ai bỏ về (undefined/không có) → chuỗi rỗng', () => {
    expect(todayMissedLine(undefined)).toBe('');
    expect(todayMissedLine({})).toBe('');
    expect(todayMissedLine({ wait: 0, stock: 0 })).toBe('');
  });
  it('có khách chờ lâu bỏ về → báo số lượt chờ (hành động: trực quầy/xếp ca)', () => {
    const out = todayMissedLine({ wait: 3 });
    expect(out).toContain('⚠');
    expect(out).toContain('3 khách bỏ về vì chờ quầy');
  });
  it('có khách không mua vì hết hàng → báo số lượt tồn (hành động: châm kệ)', () => {
    const out = todayMissedLine({ stock: 2 });
    expect(out).toContain('2 khách không mua vì hết hàng');
  });
  it('cả hai lý do → gom lại gọn bằng " · "', () => {
    const out = todayMissedLine({ wait: 1, stock: 4 });
    expect(out).toContain('1 khách bỏ về vì chờ quầy');
    expect(out).toContain('4 khách không mua vì hết hàng');
    expect(out.split(' · ').length).toBe(2);
  });
  it('chê đắt (price) KHÔNG nhắc giữa ngày — đòn giá chiến thuật, tránh nhiễu', () => {
    expect(todayMissedLine({ price: 9 } as never)).toBe('');
  });
  it('helper thuần: cùng input ra cùng chuỗi', () => {
    const m = { wait: 2, stock: 1 };
    expect(todayMissedLine(m)).toBe(todayMissedLine(m));
  });
});
