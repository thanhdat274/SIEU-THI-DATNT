import { describe, expect, it } from 'vitest';
import { priceForecast, suggestPrice } from '../data/pricing';
import { priceGap } from '../data/priceGap';

// GĐ251: gợi ý giá biết khách dịp lễ chịu giá cao (dayEffects.tolerance — Tết 0.5, ngày thường 1).
// Mẫu 'gao': nhập 80.000, bán gốc 100.000 (ref = 100.000 với marketIndex 1).

describe('suggestPrice theo tolerance dịp lễ (GĐ251)', () => {
  it('mặc định không tolerance = hành vi cũ (bằng với tolerance 1)', () => {
    expect(suggestPrice('gao', 110000, 2, 6)).toEqual(suggestPrice('gao', 110000, 2, 6, 1));
    expect(suggestPrice('gao', 100000, 6, 6)).toEqual(suggestPrice('gao', 100000, 6, 6, 1));
  });

  it('bán chạy ở giá trên trần cũ (ref×1.3): ngày thường → hold; đang lễ (0.5) → raise nới trần 1.45', () => {
    // 135.000 = ref×1.35: trên trần cũ 130.000 (hold), dưới trần lễ 145.000 (raise)
    const normal = suggestPrice('gao', 135000, 6, 6);
    expect(normal.action).toBe('hold');
    const tet = suggestPrice('gao', 135000, 6, 6, 0.5);
    expect(tet.action).toBe('raise');
    expect(tet.price).toBe(155500); // roundStep(135.000 × 1.15) = 155.500
    expect(tet.reason).toContain('lễ');
  });

  it('khách hỏi nhiều mà bán ít: ngày thường → hạ giá; đang lễ (0.5) ngưỡng khắt khe hơn → giữ', () => {
    const normal = suggestPrice('gao', 110000, 2, 6);
    expect(normal.action).toBe('cut');
    const tet = suggestPrice('gao', 110000, 2, 6, 0.5);
    expect(tet.action).toBe('hold'); // 2 < 6×0.5×0.5=1.5 không còn là "đắt quá"
  });

  it('tolerance > 1 kẹp về 1 (không có语义 "chịu giá hơn cả ngày thường")', () => {
    expect(suggestPrice('gao', 110000, 2, 6, 2)).toEqual(suggestPrice('gao', 110000, 2, 6, 1));
  });

  it('priceGap: món lễ (tolerance 0.5) thấy được khoản hụt mà ngày thường không thấy', () => {
    // Dự phóng CÓ tolerance: tại 155.500 khách lễ vẫn giữ ~0.556 → lãi/ngày cao hơn giá đang đặt
    const tet = priceGap([{ id: 'gao', price: 135000, soldPerDay: 6, wantedPerDay: 6, tolerance: 0.5 }]);
    expect(tet.offenders.length).toBe(1);
    expect(tet.offenders[0].toPrice).toBe(155500);
    expect(tet.offenders[0].gainPerDay).toBeGreaterThan(0);
    const normal = priceGap([{ id: 'gao', price: 135000, soldPerDay: 6, wantedPerDay: 6 }]);
    expect(normal.offenders.length).toBe(0);
  });

  it('priceForecast có tolerance: dự phóng giá cao lúc lễ lạc quan hơn ngày thường cùng mức giá', () => {
    const normal = priceForecast('gao', 155500, { soldPerDay: 6 });
    const tet = priceForecast('gao', 155500, { soldPerDay: 6 }, 0.5);
    expect(normal).not.toBeNull();
    expect(tet).not.toBeNull();
    expect(tet!.unitsPerDay).toBeGreaterThan(normal!.unitsPerDay);
    expect(tet!.profitPerDay).toBeGreaterThan(normal!.profitPerDay);
  });
});
