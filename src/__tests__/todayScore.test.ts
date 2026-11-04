import { describe, expect, it } from 'vitest';
import { formatMoney } from '../data/products';
import { todayLine, todayMissedLine, todayPeakLine, todayExpectCustomers, todayTopSeller } from '../data/todayScore';
import { WEATHER } from '../data/weather';
import { trafficForecast } from '../data/trafficForecast';

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
  it('GĐ1230: có byItem+services → nối thêm "lãi W" = Σ(thu−vốn) + dịch vụ (lãi bán thật, Luật 10)', () => {
    const out = todayLine({
      customers: 5, itemsSold: 3, revenue: 50000,
      byItem: {
        nuoc: { qty: 2, revenue: 12000, cost: 8000 },   // lãi 4000
        mi: { qty: 1, revenue: 38000, cost: 20000 },    // lãi 18000
      },
      services: 3000,                                    // lãi dịch vụ 3000
    });
    expect(out).toContain('thu');
    expect(out).toContain(`lãi ${formatMoney(25000)}`);  // 4000 + 18000 + 3000 = 25000
  });
  it('GĐ1230: có byItem nhưng chưa bán món nào (itemsSold 0) → không thêm phần lãi', () => {
    const out = todayLine({ customers: 0, itemsSold: 0, revenue: 0, byItem: {} });
    expect(out).toBe('');
    const out2 = todayLine({ customers: 2, itemsSold: 0, revenue: 5000, byItem: {} });
    expect(out2).not.toContain('lãi');
  });
  it('GĐ1230: lãi lỗ đúng dấu (bán lỗ vẫn báo âm, trung thực)', () => {
    const out = todayLine({
      customers: 3, itemsSold: 2, revenue: 9000,
      byItem: { kem: { qty: 2, revenue: 9000, cost: 12000 } }, // lãi −3000
    });
    expect(out).toContain(`lãi ${formatMoney(-3000)}`);
  });
  it('GĐ1231: có expectCustomers → nối " (dự kiến ~N)" ngay sau số khách (đối chiếu on-track)', () => {
    const out = todayLine({ customers: 12, itemsSold: 15, revenue: 45000, expectCustomers: 44 });
    expect(out).toContain('12 khách (dự kiến ~44)');
    expect(out).toContain('15 món');
    expect(out).toContain('thu');
  });
  it('GĐ1231: không truyền expectCustomers → giữ nguyên dòng cũ (không thêm mốc, not ép)', () => {
    const out = todayLine({ customers: 3, itemsSold: 2, revenue: 15000 });
    expect(out).toContain('3 khách');
    expect(out).not.toContain('dự kiến');
  });
  it('GĐ1231: expectCustomers 0 → không thêm mốc (đừng ồn "~0")', () => {
    const out = todayLine({ customers: 2, itemsSold: 1, revenue: 8000, expectCustomers: 0 });
    expect(out).toContain('2 khách');
    expect(out).not.toContain('dự kiến');
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

describe('todayExpectCustomers — neo "dự kiến hôm nay" (GĐ1231)', () => {
  it('đồng bộ trafficForecast.todayKhach (nắng, level 20 → ~110 khách)', () => {
    const a = { weather: 'sunny' as const, tomorrow: 'sunny' as const, level: 20, day: 5, seed: 7 };
    expect(todayExpectCustomers(a)).toBe(Math.round(trafficForecast(a).todayKhach));
  });
  it('giông bão → ít hơn nắng (cùng mốc level/ngày)', () => {
    const sunny = todayExpectCustomers({ weather: 'sunny', tomorrow: 'sunny', level: 20, day: 5, seed: 7 });
    const storm = todayExpectCustomers({ weather: 'storm', tomorrow: 'storm', level: 20, day: 5, seed: 7 });
    expect(storm).toBeLessThan(sunny);
  });
  it('helper thuần: cùng input ra cùng số (không đổi theo state)', () => {
    const a = { weather: 'rain' as const, tomorrow: 'cloudy' as const, level: 15, day: 10, seed: 3 };
    expect(todayExpectCustomers(a)).toBe(todayExpectCustomers(a));
  });
});

describe('todayTopSeller — bề mặt "món chạy nhất hôm nay" giữa ngày (GĐ1232)', () => {
  it('undefined/không bán gì → chuỗi rỗng (đầu ngày đừng ồn)', () => {
    expect(todayTopSeller(undefined)).toBe('');
    expect(todayTopSeller({})).toBe('');
  });
  it('người dẫn RÕ (chạy nhất ≥3 và gấp ≥2 món nhì) → báo tên món + số món đã bán', () => {
    const out = todayTopSeller({ nuoc: { qty: 8, revenue: 24000, cost: 12000 }, mi: { qty: 3, revenue: 9000, cost: 6000 } });
    expect(out).toContain('món chạy nhất');
    expect(out).toContain('Nước suối');
    expect(out).toContain('(8)');
  });
  it('người dẫn chưa RÕ (kém 2× món nhì) → rỗng, không nhiễu', () => {
    // 4 vs 3: chưa tới 2× → đừng gọi ai "chạy nhất" khi còn xoay xở
    const out = todayTopSeller({ nuoc: { qty: 4, revenue: 12000, cost: 6000 }, mi: { qty: 3, revenue: 9000, cost: 6000 } });
    expect(out).toBe('');
  });
  it('bán ít (<3 món) → rỗng (chưa đủ lượng để tin tưởng chỉ bảo)', () => {
    const out = todayTopSeller({ nuoc: { qty: 2, revenue: 6000, cost: 3000 } });
    expect(out).toBe('');
  });
  it('helper thuần: cùng input ra cùng chuỗi', () => {
    const b = { nuoc: { qty: 7, revenue: 21000, cost: 10000 }, mi: { qty: 3, revenue: 9000, cost: 6000 } };
    expect(todayTopSeller(b)).toBe(todayTopSeller(b));
  });
});
