import { describe, it, expect } from 'vitest';
import { festivalValue, festivalVerdict } from '../data/festivalValue';

// calendar: YEAR_OFFSET=0 nên doy = day-1. Tết: doy 27..38 (ngày game 28..39, traffic 1.7, cost 1.2).
// Mùa mưa: doy 273..303 (ngày game 274..304, traffic 1.0, cost 1.03). Ngày 100 (doy 99) không gần lễ nào.

describe('festivalValue — soi dịp lễ ra khách/tiền', () => {
  it('đang trong Tết (×1.7) → thêm 70 khách/ngày ≈ 1.4M (avg giỏ 20k)', () => {
    const r = festivalValue({ day: 30, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r).not.toBeNull();
    expect(r!.festival.id).toBe('tet');
    expect(r!.onNow).toBe(true);
    expect(r!.inDays).toBe(0);
    expect(r!.traffic).toBe(1.7);
    expect(r!.cost).toBe(1.2);
    expect(r!.deltaKhachPerDay).toBeCloseTo(100 * 0.7, 6); // 70
    expect(r!.moneyDeltaPerDay).toBeCloseTo(70 * 20_000, 1); // 1.4M
    expect(r!.verdict).toBe('huge');
    expect(r!.hotIds.length).toBeGreaterThan(0);
  });

  it('trước Tết 2 ngày (ngày 26) → upcoming inDays 2', () => {
    const r = festivalValue({ day: 26, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r!.onNow).toBe(false);
    expect(r!.festival.id).toBe('tet');
    expect(r!.inDays).toBe(2);
    expect(r!.verdict).toBe('huge');
  });

  it('mùa mưa (×1.0) → không thêm khách, verdict modest', () => {
    const r = festivalValue({ day: 280, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r!.festival.id).toBe('mua_mua');
    expect(r!.deltaKhachPerDay).toBeCloseTo(0, 6);
    expect(r!.moneyDeltaPerDay).toBeCloseTo(0, 1);
    expect(r!.verdict).toBe('modest');
  });

  it('ngày không gần lễ nào → null', () => {
    expect(festivalValue({ day: 100, level: 20, customers: 200, revenue: 4_000_000 })).toBeNull();
  });

  it('festivalVerdict phân loại theo traffic', () => {
    expect(festivalVerdict(1.7)).toBe('huge');
    expect(festivalVerdict(1.3)).toBe('big');
    expect(festivalVerdict(1.1)).toBe('modest');
    expect(festivalVerdict(1.0)).toBe('modest');
  });
});
