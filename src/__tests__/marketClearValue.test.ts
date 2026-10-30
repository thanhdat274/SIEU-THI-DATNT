import { describe, it, expect } from 'vitest';
import { isMarketDay, marketClearValue, marketTrafficFactor, MARKET_TRAFFIC, CLEAR_DISCOUNT, MAX_CLEAR_ITEMS, MAX_CLEAR_UNITS } from '../data/chophien';
import { scarcityMul } from '../data/market';

// GĐ135: "🧺 Chợ phiên cuối ngõ" — bản đánh giá thuần-đọc hàng DƯ (slice 1 của mở rộng Gánh hàng rong).
// CHỈ định giá + preview, không bán/đổi tiền/SAVE_VERSION. Bán thật ở GĐ136.

// Mì gói: sell 5000, dry, không cần lạnh.
// Thịt đông lạnh: sell 85000, frozen, cần lạnh.
// Sữa chua: sell 8000, cold, cần lạnh.
// Nước suối: sell 6000, drink, không cần lạnh.
const health = (id: string, daysLeft: number | null) => ({
  id, name: 'x', qty30: 0, profit30: 0, revenue30: 0, profit21: 0, margin: 0,
  dailyQty: 0, daysLeft, spoilShare: 0, lostShare: 0, abc: 'B' as const,
});

describe('isMarketDay', () => {
  it('chợ phiên mỗi tuần từ ngày 7, không phải ngày thường', () => {
    expect(isMarketDay(0)).toBe(false);
    expect(isMarketDay(3)).toBe(false);
    expect(isMarketDay(6)).toBe(false);
    expect(isMarketDay(7)).toBe(true);
    expect(isMarketDay(14)).toBe(true);
    expect(isMarketDay(8)).toBe(false);
    expect(isMarketDay(21)).toBe(true);
  });

  it('GĐ182 — hôm phiên chợ đông khách hơn (1.15), ngày thường bằng 1', () => {
    expect(marketTrafficFactor(7)).toBe(MARKET_TRAFFIC);
    expect(marketTrafficFactor(14)).toBe(MARKET_TRAFFIC);
    expect(marketTrafficFactor(6)).toBe(1);
    expect(marketTrafficFactor(8)).toBe(1);
    expect(MARKET_TRAFFIC).toBeGreaterThan(1);
    expect(MARKET_TRAFFIC).toBeLessThan(1.5); // nâng nhẹ, không phá cân bằng
  });
});

describe('marketClearValue', () => {
  it('null khi không phải ngày chợ', () => {
    expect(marketClearValue({ day: 5, storage: { mi: 20 }, shelved: {}, health: [health('mi', 20)] })).toBeNull();
  });

  it('null khi không có món DƯ (món bán nhanh, không tồn lâu)', () => {
    // mi bán nhanh (daysLeft 1), ít, không cần lạnh → không dư
    const v = marketClearValue({
      day: 7, storage: { mi: 2 }, shelved: {}, health: [health('mi', 1)],
    });
    expect(v).toBeNull();
  });

  it('nhận diện món DƯ do bán chậm (tồn lâu)', () => {
    const v = marketClearValue({
      day: 7, storage: { mi: 20 }, shelved: {}, health: [health('mi', 20)],
    })!;
    expect(v).not.toBeNull();
    expect(v.rows[0].reason).toBe('slow');
    expect(v.rows[0].name).toBe('Mì gói');
  });

  it('nhận diện món DƯ do cần lạnh nắm nhiều (dù bán nhanh)', () => {
    // thit cần lạnh, nắm 10 món (>4) dù bán nhanh → reason cold
    const v = marketClearValue({
      day: 7, storage: { thit: 10 }, shelved: {}, health: [health('thit', 1)],
    })!;
    expect(v.rows[0].reason).toBe('cold');
    expect(v.rows[0].name).toBe('Thịt đông lạnh');
  });

  it('ước giá = qty × sell × chiết khấu chợ × hệ khan hiếm', () => {
    // mi sell 5000, 8 món (≤ trần) : total ≤10 → scarcityMul==1.04
    const v = marketClearValue({
      day: 7, storage: { mi: 8 }, shelved: {}, health: [health('mi', 20)],
    })!;
    const expected = Math.round(8 * 5000 * CLEAR_DISCOUNT * scarcityMul(8));
    expect(v.rows[0].est).toBe(expected);
    expect(v.total).toBe(expected);
  });

  it('chặn số món và tổng đơn vị gánh ra (không bán sạch kho)', () => {
    // nhiều món dư → tối đa MAX_CLEAR_ITEMS món, tổng MAX_CLEAR_UNITS đơn vị
    const many = [20, 20, 20, 20, 20].map((n, i) => health(['mi', 'nuoc', 'banh', 'ngot', 'sua'][i], 20));
    const v = marketClearValue({
      day: 7,
      storage: { mi: 20, nuoc: 20, banh: 20, ngot: 20, sua: 20 },
      shelved: {},
      health: many,
    })!;
    expect(v.rows.length).toBeLessThanOrEqual(MAX_CLEAR_ITEMS);
    expect(v.units).toBeLessThanOrEqual(MAX_CLEAR_UNITS);
  });

  it('không NaN với kho trống / số liệu bất thường', () => {
    const v = marketClearValue({ day: 7, storage: {}, shelved: {}, health: [] });
    expect(v).toBeNull();
    const v2 = marketClearValue({
      day: 7, storage: { mi: -5 }, shelved: { mi: 100 }, health: [health('mi', 99)],
    })!;
    expect(Number.isFinite(v2.total)).toBe(true);
  });
});

import { marketDayAction } from '../data/chophien';

describe('marketDayAction — chợ phiên thành việc sáng (GĐ290)', () => {
  it('không có hàng dư hoặc null -> null', () => {
    expect(marketDayAction(null)).toBeNull();
    expect(marketDayAction({ day: 7, rows: [], total: 0, units: 0 })).toBeNull();
  });

  it('có hàng dư đáng gánh -> trả về DayAction với icon 🧺 và số món', () => {
    const act = marketDayAction({
      day: 7,
      rows: [{ id: 'mi', name: 'Mì', qty: 5, est: 20000, reason: 'slow' }],
      total: 20000,
      units: 5,
    });
    expect(act).not.toBeNull();
    expect(act!.icon).toBe('🧺');
    expect(act!.text).toContain('5 món dư');
    expect(act!.text).toContain('20.000đ');
    expect(act!.panel).toBe('morning');
  });
});