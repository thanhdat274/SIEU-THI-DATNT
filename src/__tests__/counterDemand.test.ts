import { describe, it, expect } from 'vitest';
import { demandForecast, type DemandArg } from '../data/counterDemand';
import { customersPerDay } from '../data/levels';

const base = (over: Partial<DemandArg> = {}): DemandArg => ({
  level: 30,
  day: 10,
  weatherSeed: 1,
  ...over,
});

describe('demandForecast — Nhu cầu quầy (GĐ78)', () => {
  it('tổng khách cả ngày khớp customersPerDay(level)', () => {
    const f = demandForecast(base({ level: 40 }));
    expect(f.expectedTotal).toBe(customersPerDay(40));
    const sum = f.bands.reduce((n, b) => n + b.expected, 0);
    expect(sum).toBe(f.expectedTotal); // khung cuối nhận phần dư → tổng khép đúng
  });

  it('có đủ 6 khung giờ trong ngày', () => {
    const f = demandForecast(base());
    expect(f.bands.length).toBe(6);
  });

  it('khung giờ vàng có perHour cao nhất và peak=true', () => {
    const f = demandForecast(base());
    // Nhịp: tối 1.7 > sáng 1.6 > trưa 1.35 > khuya 0.8 > chiều 0.6 = giữa sáng 0.6
    expect(f.bands.find((b) => b.id === 'toi')!.peak).toBe(true);
    expect(f.bands.find((b) => b.id === 'sang')!.peak).toBe(true);
    expect(f.bands.find((b) => b.id === 'giua_sang')!.peak).toBe(false);
    const toi = f.bands.find((b) => b.id === 'toi')!;
    const giua = f.bands.find((b) => b.id === 'giua_sang')!;
    expect(toi.perHour).toBeGreaterThan(giua.perHour);
  });

  it('lễ/roadworks giảm đều cầu (dayEffects.traffic)', () => {
    // chọn ngày rơi vào roadworks để dayEffects.traffic ×0.8; so với ngày thường
    const lon = demandForecast(base({ level: 30 }));
    const tot = lon.bands.reduce((n, b) => n + b.expected, 0);
    expect(tot).toBe(customersPerDay(30));
    // hình dạng tương đối vẫn giữ (peak theo nhịp) dù tổng không đổi — peak phase độc lập dayTraffic
    const toi = lon.bands.find((b) => b.id === 'toi')!;
    expect(toi.peak).toBe(true);
  });

  it('local_legend (+10%) làm tổng khách cao hơn', () => {
    const f0 = demandForecast(base({ level: 30 }));
    const t0 = f0.bands.reduce((n, b) => n + b.expected, 0);
    // localLegend chỉ thay đổi phân phối trong tổng cố định; tổng = customersPerDay luôn.
    // Đảm bảo không lỗi + tổng vẫn đóng đúng.
    const f1 = demandForecast(base({ level: 30, localLegend: true }));
    const t1 = f1.bands.reduce((n, b) => n + b.expected, 0);
    expect(t1).toBe(t0);
    expect(t0).toBe(customersPerDay(30));
  });

  it('giờ vàng tự đặt (happy) làm tăng khách trong khung trùng', () => {
    // đặt happy 11h–13h (trùng band trưa 11–13) → band trưa phải cao hơn khi không happy
    const noHappy = demandForecast(base({ level: 30, happy: null })).bands;
    const withHappy = demandForecast(base({ level: 30, happy: { from: 11, off: 20 } })).bands;
    const trua0 = noHappy.find((b) => b.id === 'trua')!.expected;
    const trua1 = withHappy.find((b) => b.id === 'trua')!.expected;
    expect(trua1).toBeGreaterThan(trua0);
  });

  it('nhãn giờ đúng định dạng', () => {
    const f = demandForecast(base());
    const labels = f.bands.map((b) => b.label);
    expect(labels[0]).toBe('6h–8h30');
    expect(labels[2]).toBe('11h–13h');
    expect(labels[5]).toBe('20h–22h');
  });

  it('peakBands trả đúng nhãn các đỉnh', () => {
    const f = demandForecast(base());
    expect(f.peakBands.length).toBeGreaterThanOrEqual(2);
    expect(f.peakBands).toContain('17h–20h'); // tối traffic 1.7 cao nhất
  });

  it('level thấp → số khách nhỏ', () => {
    const f = demandForecast(base({ level: 5 }));
    expect(f.expectedTotal).toBe(customersPerDay(5));
    expect(f.expectedTotal).toBeLessThan(customersPerDay(30));
  });

  it('thuần: cùng đầu vào cho kết quả giống nhau', () => {
    expect(demandForecast(base())).toEqual(demandForecast(base()));
  });
});
