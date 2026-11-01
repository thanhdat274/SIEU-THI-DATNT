import { describe, expect, it } from 'vitest';
import { computeRecords, recordFeedToday, type RecordsInput } from '../data/records';

/** Sổ Kỷ lục: rút cột mốc cá nhân cao nhất từ lịch sử ngày + sổ bán + combo — thuần đọc. */

function base(): RecordsInput {
  return { history: [], soldEver: {}, comboHitCount: {}, level: 3, prestigeBonus: 0.08 };
}

describe('computeRecords — rút kỷ lục từ state', () => {
  it('chưa có ngày nào → mọi kỷ lục ngày null, tổng 0, daysTracked 0', () => {
    const r = computeRecords(base());
    expect(r.bestRevenueDay).toBeNull();
    expect(r.bestProfitDay).toBeNull();
    expect(r.bestCustomersDay).toBeNull();
    expect(r.totalRevenue).toBe(0);
    expect(r.totalCustomers).toBe(0);
    expect(r.daysTracked).toBe(0);
  });

  it('một ngày → mọi kỷ lục chính là ngày đó', () => {
    const r = computeRecords({ ...base(), history: [{ day: 5, revenue: 100000, profit: 20000, customers: 30 }] });
    expect(r.bestRevenueDay).toEqual({ day: 5, value: 100000 });
    expect(r.bestProfitDay).toEqual({ day: 5, value: 20000 });
    expect(r.bestCustomersDay).toEqual({ day: 5, value: 30 });
    expect(r.daysTracked).toBe(1);
  });

  it('nhiều ngày → lấy max đúng cho từng chỉ số (không nhất thiết cùng ngày)', () => {
    const history = [
      { day: 1, revenue: 50000, profit: 5000, customers: 20 },
      { day: 2, revenue: 90000, profit: 3000, customers: 40 },
      { day: 3, revenue: 70000, profit: 12000, customers: 10 },
    ];
    const r = computeRecords({ ...base(), history });
    expect(r.bestRevenueDay).toEqual({ day: 2, value: 90000 });
    expect(r.bestProfitDay).toEqual({ day: 3, value: 12000 });
    expect(r.bestCustomersDay).toEqual({ day: 2, value: 40 });
    expect(r.totalRevenue).toBe(210000);
    expect(r.totalCustomers).toBe(70);
    expect(r.daysTracked).toBe(3);
  });

  it('bằng nhau → giữ ngày đầu tiên gặp (deterministic)', () => {
    const history = [
      { day: 1, revenue: 60000, profit: 9000, customers: 25 },
      { day: 2, revenue: 60000, profit: 9000, customers: 25 },
    ];
    const r = computeRecords({ ...base(), history });
    expect(r.bestRevenueDay).toEqual({ day: 1, value: 60000 });
    expect(r.bestProfitDay).toEqual({ day: 1, value: 9000 });
    expect(r.bestCustomersDay).toEqual({ day: 1, value: 25 });
  });

  it('món yêu thích: lớn nhất trong soldEver (chỉ đếm qty>0), null khi trống', () => {
    const r1 = computeRecords({ ...base(), soldEver: { mi: 40, nuoc: 25, banh: 10 } });
    expect(r1.favoriteProduct).toEqual({ name: 'Mì gói', qty: 40 });
    const r2 = computeRecords({ ...base(), soldEver: {} });
    expect(r2.favoriteProduct).toBeNull();
    const r3 = computeRecords({ ...base(), soldEver: { mi: 0, nuoc: 0 } });
    expect(r3.favoriteProduct).toBeNull();
  });

  it('combo kích hoạt nhất: lớn nhất trong comboHitCount, null khi trống', () => {
    const r1 = computeRecords({ ...base(), comboHitCount: { mi_nuoc: 7, banh_ngot: 2 } });
    expect(r1.bestCombo).toEqual({ name: 'Mì gói + nước suối', hits: 7 });
    const r2 = computeRecords({ ...base(), comboHitCount: {} });
    expect(r2.bestCombo).toBeNull();
  });

  it('giữ cấp và bonus tái sinh', () => {
    const r = computeRecords({ ...base(), level: 12, prestigeBonus: 0.24 });
    expect(r.level).toBe(12);
    expect(r.prestigeBonus).toBe(0.24);
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const input = {
      history: [{ day: 1, revenue: 10, profit: 2, customers: 3 }, { day: 2, revenue: 20, profit: 5, customers: 9 }],
      soldEver: { mi: 5 },
      comboHitCount: { mi_nuoc: 3 },
      level: 4,
      prestigeBonus: 0.08,
    };
    expect(computeRecords(input)).toEqual(computeRecords(input));
  });
});

describe('recordFeedToday — feed "đang trên đà phá kỷ lục"', () => {
  it('lãi hôm nay trừ đủ: doanh thu − chi − lương − nhà − phí vận hành (2% doanh thu)', () => {
    const r = computeRecords({ ...base(), history: [{ day: 1, revenue: 500000, profit: 100000, customers: 40 }] });
    const feed = recordFeedToday({ revenue: 100000, spent: 20000, wages: 5000, rent: 10000, customers: 10 }, r);
    expect(feed[1].today).toBe(63000); // 100000-20000-5000-10000-2000
  });

  it('chưa có ngày nào → best null, today là số chạy, không bao giờ beating', () => {
    const r = computeRecords(base());
    const feed = recordFeedToday({ revenue: 5000, spent: 0, customers: 3 }, r);
    expect(feed).toHaveLength(3);
    for (const f of feed) {
      expect(f.best).toBeNull();
      expect(f.beating).toBe(false);
      expect(f.remaining).toBe(0);
    }
    expect(feed[0].today).toBe(5000);
    expect(feed[2].today).toBe(3);
  });

  it('hôm nay chưa kịp kỷ lục → remaining = kỷ lục − hôm nay, không beating', () => {
    const r = computeRecords({ ...base(), history: [{ day: 1, revenue: 100000, profit: 20000, customers: 40 }] });
    const feed = recordFeedToday({ revenue: 60000, spent: 0, customers: 20 }, r);
    expect(feed[0]).toMatchObject({ best: 100000, today: 60000, remaining: 40000, beating: false });
    expect(feed[2]).toMatchObject({ best: 40, today: 20, remaining: 20, beating: false });
  });

  it('hôm nay vượt kỷ lục → beating true, remaining 0 (không âm)', () => {
    const r = computeRecords({ ...base(), history: [{ day: 1, revenue: 100000, profit: 20000, customers: 40 }] });
    const feed = recordFeedToday({ revenue: 150000, spent: 0, customers: 55 }, r);
    expect(feed[0]).toMatchObject({ best: 100000, today: 150000, remaining: 0, beating: true });
    expect(feed[2]).toMatchObject({ best: 40, today: 55, remaining: 0, beating: true });
    expect(feed[0].unit).toBe('money');
    expect(feed[2].unit).toBe('count');
  });

  it('bằng đúng kỷ lục → chưa tính là beating (cần vượt hẳn)', () => {
    const r = computeRecords({ ...base(), history: [{ day: 1, revenue: 100000, profit: 20000, customers: 40 }] });
    const feed = recordFeedToday({ revenue: 100000, spent: 0, customers: 40 }, r);
    expect(feed[0].beating).toBe(false);
    expect(feed[0].remaining).toBe(0);
  });
});
