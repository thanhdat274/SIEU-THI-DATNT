import { describe, expect, it } from 'vitest';
import { adRoi, ADS } from '../data/biz';
import { promoEffect, logAnalyticsDay, newAnalytics, type AnalyticsState } from '../data/analytics';

/**
 * GĐ128 — ROI quảng cáo: quy doanh thu chênh (ngày có quảng cáo vs ngày thường) ra
 * lời/lỗ ròng so với chi phí ad/ngày. THUẦN đọc; không đổi save/kinh tế.
 */

const runningAds = (ids: string[], untilDay: number) =>
  ids.map((id) => ({ id, untilDay }));

describe('adRoi — quy hiệu quả quảng cáo ra lời/lỗ so với chi phí', () => {
  it('null khi chưa có dữ liệu so sánh (effect null)', () => {
    expect(adRoi(null, [], 5)).toBeNull();
    expect(adRoi(undefined, [], 5)).toBeNull();
  });

  it('null khi không có ad đang chạy hôm nay', () => {
    const eff = { withAvg: 500000, withoutAvg: 300000 };
    // ads chỉ còn hiệu lực tới ngày 4, mà giờ là ngày 5 → không còn chạy
    expect(adRoi(eff, runningAds(['loa'], 4), 5)).toBeNull();
  });

  it('với ad đang chạy: adExtraRev = withAvg−withoutAvg, net = extra − chi phí/ngày', () => {
    const eff = { withAvg: 500000, withoutAvg: 300000 };
    // Loa phát thanh: 60.000/1 ngày = 60.000/ngày
    expect(adRoi(eff, runningAds(['loa'], 5), 5)).toEqual({
      withAvg: 500000, withoutAvg: 300000, adExtraRev: 200000, dailyCost: 60000, net: 140000, worth: 'yes',
    });
  });

  it('worth=no khi chi phí vượt doanh thu kéo thêm', () => {
    const eff = { withAvg: 300000, withoutAvg: 280000 }; // chỉ thêm 20k
    const r = adRoi(eff, runningAds(['loa'], 5), 5)!;
    expect(r.adExtraRev).toBe(20000);
    expect(r.dailyCost).toBe(60000);
    expect(r.net).toBe(-40000);
    expect(r.worth).toBe('no');
  });

  it('chi phí/ngày đúng nhiều ad (to_roi 150k/3ngày=50k + bang_ron 400k/7ngày≈57143)', () => {
    const eff = { withAvg: 1000000, withoutAvg: 500000 };
    const r = adRoi(eff, runningAds(['to_roi', 'bang_ron'], 8), 8)!;
    expect(r.dailyCost).toBeCloseTo(150000 / 3 + 400000 / 7, 1);
    expect(r.adExtraRev).toBe(500000);
  });
});

describe('promoEffect kind ads — tách ngày có/không quảng cáo từ cờ', () => {
  const build = (days: { day: number; revenue: number; ads: boolean }[]): AnalyticsState => {
    let a = newAnalytics();
    for (const d of days) {
      a = logAnalyticsDay(a, d.day, {}, {}, {}, { combo: false, happyHour: false, ads: d.ads });
    }
    return a;
  };

  it('so sánh ngày có vs không quảng cáo (dùng revenue từ history)', () => {
    const a = build([
      { day: 1, revenue: 600000, ads: true },
      { day: 2, revenue: 500000, ads: true },
      { day: 3, revenue: 300000, ads: false },
      { day: 4, revenue: 260000, ads: false },
    ]);
    // history phải đồng bộ day → revenue với flags
    const history = [
      { day: 1, profit: 0, revenue: 600000 },
      { day: 2, profit: 0, revenue: 500000 },
      { day: 3, profit: 0, revenue: 300000 },
      { day: 4, profit: 0, revenue: 260000 },
    ];
    const fx = promoEffect(a, history, 'ads')!;
    expect(fx.withAvg).toBe(550000); // (600000+500000)/2
    expect(fx.withoutAvg).toBe(280000); // (300000+260000)/2
    expect(fx.withDays).toBe(2);
    expect(fx.withoutDays).toBe(2);
  });

  it('ngày chưa ghi cờ ads (save cũ) → toàn bộ coi không có ads → promoEffect trả null (chưa đủ 2 bên so)', () => {
    let a = newAnalytics();
    a = logAnalyticsDay(a, 1, {}, {}, {}, { combo: false, happyHour: false }); // thiếu ads → undefined
    a = logAnalyticsDay(a, 2, {}, {}, {}, { combo: false, happyHour: false, ads: false });
    const history = [
      { day: 1, profit: 0, revenue: 400000 },
      { day: 2, profit: 0, revenue: 410000 },
    ];
    // không ngày nào ads=true → thiếu bên with → null (an toàn, không crash)
    expect(promoEffect(a, history, 'ads')).toBeNull();
  });
});
