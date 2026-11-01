import { describe, it, expect } from 'vitest';
import { isNightHour, nightRevenueToday, nightWageOf, nightPnl } from '../data/nightReport';

describe('GĐ65 — Báo cáo ca đêm tiệm chính (nightReport)', () => {
  describe('isNightHour', () => {
    it('giờ ≥22 là đêm (22h–30h kéo dài qua nửa đêm)', () => {
      expect(isNightHour(22)).toBe(true);
      expect(isNightHour(23)).toBe(true);
      expect(isNightHour(24)).toBe(true);
      expect(isNightHour(29)).toBe(true);
    });
    it('giờ ngày 6h–21h không phải đêm (ngày bắt đầu 6h nên giờ 0–5 không có dữ liệu)', () => {
      expect(isNightHour(6)).toBe(false);
      expect(isNightHour(12)).toBe(false);
      expect(isNightHour(21)).toBe(false);
    });
  });

  describe('nightRevenueToday', () => {
    it('chỉ gộp doanh thu các giờ ≥22, không lẫn giờ ngày', () => {
      const byHour = { 10: { revenue: 500 }, 22: { revenue: 1000 }, 13: { revenue: 700 }, 24: { revenue: 200 } };
      expect(nightRevenueToday(byHour)).toBe(1200);
    });
    it('không có dữ liệu / rỗng → 0', () => {
      expect(nightRevenueToday(undefined)).toBe(0);
      expect(nightRevenueToday({})).toBe(0);
    });
    it('không có giờ đêm → 0', () => {
      expect(nightRevenueToday({ 6: { revenue: 100 }, 21: { revenue: 300 } })).toBe(0);
    });
  });

  describe('nightWageOf', () => {
    it('chỉ tính nhân viên trong ca đêm, đã nhân pay 1.5 đúng như dailyWage', () => {
      const staff = [
        { shift: 'night', wage: 100000 },
        { shift: 'morning', wage: 100000 },
        { shift: 'full', wage: 100000 },
      ];
      expect(nightWageOf(staff, [])).toBe(150000);
    });
    it('cộng dồn nhiều nhân viên ca đêm', () => {
      const staff = [
        { shift: 'night', wage: 100000 },
        { shift: 'night', wage: 80000 },
      ];
      expect(nightWageOf(staff, [])).toBe(270000); // (100k+80k) × 1.5
    });
    it('ky nang good_boss giam 10% (khớp wagesDue)', () => {
      const staff = [{ shift: 'night', wage: 100000 }];
      expect(nightWageOf(staff, [])).toBe(150000);
      expect(nightWageOf(staff, ['good_boss'])).toBe(135000);
    });
    it('không nhân viên / undefined → 0', () => {
      expect(nightWageOf([], [])).toBe(0);
      expect(nightWageOf(undefined, undefined)).toBe(0);
    });
  });

  describe('nightPnl', () => {
    it('lời khi doanh thu đêm > lương ca đêm → ok', () => {
      const p = nightPnl({ 23: { revenue: 400000 } }, [{ shift: 'night', wage: 100000 }], []);
      expect(p).toEqual({ revenue: 400000, wages: 150000, net: 250000, verdict: 'ok' });
    });
    it('lỗ khi lương ca đêm > doanh thu đêm → warn', () => {
      const p = nightPnl({ 23: { revenue: 50000 } }, [{ shift: 'night', wage: 100000 }], []);
      expect(p.verdict).toBe('warn');
      expect(p.net).toBe(-100000);
    });
    it('idle khi cả hai bằng 0 → UI ẩn', () => {
      const p = nightPnl(undefined, [], []);
      expect(p.verdict).toBe('idle');
      expect(p.net).toBe(0);
    });
    it('helper thuần — không import module kinh doanh (test biên dữ liệu đơn giản)', () => {
      const a = nightPnl({ 22: { revenue: 10 } }, [{ shift: 'night', wage: 0 }], []);
      const b = nightPnl({ 22: { revenue: 10 } }, [{ shift: 'night', wage: 0 }], []);
      expect(a).toEqual(b);
    });
  });
});
