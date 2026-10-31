import { describe, expect, it } from 'vitest';
import { FORECAST_FLAT_BAND, PRICE_RULES, formatDeltaK, priceForecast, productSensitivity, referenceSell } from '../data/pricing';
import { productById } from '../data/products';

/** Dự phóng trước khi chốt giá bán: thuần đọc demand/sales truyền vào × độ nhạy giá có sẵn — không đụng store, không đổi công thức kinh tế. */

describe('priceForecast — tăng giá', () => {
  it('cầu giảm theo keepChance: tăng giá thì món/ngày giảm, giá càng cao càng tụt', () => {
    const input = { soldPerDay: 4, wantedPerDay: 5 };
    const base = productById('nuoc'); // nhạy giá nhất (2.6)
    const up1 = priceForecast('nuoc', base.sell + 1000, input)!;
    const up2 = priceForecast('nuoc', base.sell + 3000, input)!;
    expect(up1.unitsRatio).toBeLessThan(1);
    expect(up2.unitsRatio).toBeLessThan(up1.unitsRatio);
    // Đúng công thức keepChance đang dùng trong mô phỏng (khách vẫn lấy tối thiểu minKeepChance)
    const ratio = (base.sell + 3000) / referenceSell('nuoc');
    const expected = Math.max(PRICE_RULES.minKeepChance, 1 - productSensitivity('nuoc') * (ratio - 1));
    expect(up2.unitsPerDay).toBeCloseTo(4 * expected, 5);
  });

  it('lãi có thể tăng dù khách bớt (món bền), hoặc giảm nếu món nhạy', () => {
    const input = { soldPerDay: 3, wantedPerDay: 4 };
    const gao = productById('gao');
    const fc = priceForecast('gao', gao.sell + 2000, input)!;
    expect(fc.unitsRatio).toBeLessThan(1);
    // gao bền (1.1) — tăng nhẹ 2k vẫn lời hơn baseline
    expect(fc.profitRatio).toBeGreaterThan(1 + FORECAST_FLAT_BAND);
  });
});

describe('priceForecast — giảm giá', () => {
  it('cầu tăng theo demandPriceFactor nhưng không vượt trần 1.15', () => {
    const input = { soldPerDay: 4, wantedPerDay: 5 };
    const base = productById('nuoc');
    const down = priceForecast('nuoc', base.sell - 2000, input)!;
    expect(down.unitsRatio).toBeGreaterThan(1);
    expect(down.unitsRatio).toBeLessThanOrEqual(PRICE_RULES.lowPriceDemandCap * 1.0001);
  });

  it('giảm sâu thì lãi thường mỏng hơn baseline (lời/món giảm nhiều hơn khách thêm vào)', () => {
    const input = { soldPerDay: 3, wantedPerDay: 4 };
    const base = productById('nuoc');
    const fc = priceForecast('nuoc', base.sell - 3000, input)!;
    // lãi/món giảm 3000 trên 10000 (~30%) trong khi khách tăng tối đa 15%
    expect(fc.profitRatio).toBeLessThan(1);
  });
});

describe('priceForecast — nhãn không đổi đáng kể (±5%)', () => {
  it('nhích giá bước nhỏ trên món bền: tỉ lệ nằm trong biên ±5%', () => {
    const input = { soldPerDay: 3, wantedPerDay: 4 };
    const gao = productById('gao');
    const fc = priceForecast('gao', gao.sell + 500, input)!;
    expect(fc.unitsRatio).toBeGreaterThan(1 - FORECAST_FLAT_BAND);
    expect(fc.profitRatio).toBeLessThan(1 + FORECAST_FLAT_BAND);
    expect(fc.profitRatio).toBeGreaterThan(1 - FORECAST_FLAT_BAND);
  });
});

describe('priceForecast — trường hợp trả null', () => {
  it('giá trùng giá gốc → null (chưa chỉnh gì thì không dự phóng)', () => {
    expect(priceForecast('mi', productById('mi').sell, { soldPerDay: 4, wantedPerDay: 5 })).toBeNull();
  });

  it('món nhà làm/nấu → null (giá do công thức quyết, không dự phóng)', () => {
    expect(priceForecast('tra_sua', productById('tra_sua').sell + 1000, { soldPerDay: 4, wantedPerDay: 5 })).toBeNull();
    expect(priceForecast('banh_mi_trung_nuong', 30000, { soldPerDay: 4, wantedPerDay: 5 })).toBeNull();
  });

  it('chưa có dữ liệu bán/hỏi → null (không bịa số)', () => {
    const base = productById('mi');
    expect(priceForecast('mi', base.sell + 1000, {})).toBeNull();
    expect(priceForecast('mi', base.sell + 1000, { soldPerDay: 0, wantedPerDay: 0 })).toBeNull();
  });
});

describe('priceForecast — tính thuần & baseline', () => {
  it('cùng đối số → cùng kết quả (không ngẫu nhiên, hai máy thấy chung ước tính)', () => {
    const input = { soldPerDay: 2.5, wantedPerDay: 3.5 };
    const a = priceForecast('banh', productById('banh').sell + 1500, input);
    const b = priceForecast('banh', productById('banh').sell + 1500, input);
    expect(a).toEqual(b);
  });

  it('baseline là giá gốc của món: units/profit baseline khớp dữ liệu truyền vào', () => {
    const input = { soldPerDay: 3, wantedPerDay: 5 };
    const base = productById('trung');
    const fc = priceForecast('trung', base.sell + 1000, input)!;
    expect(fc.baseUnitsPerDay).toBe(3);
    expect(fc.baseProfitPerDay).toBeCloseTo(3 * (base.sell - base.buy), 5);
    expect(fc.baseProfitPerDay).toBeGreaterThan(0);
  });

  it('lãi/ngày ở giá mới = món/ngày ước tính × lời/món', () => {
    const input = { soldPerDay: 4, wantedPerDay: 6 };
    const base = productById('kem');
    const price = base.sell + 500;
    const fc = priceForecast('kem', price, input)!;
    expect(fc.profitPerDay).toBeCloseTo(fc.unitsPerDay * (price - base.buy), 5);
  });
});

describe('formatDeltaK — delta lãi nhỏ < 500đ hiển thị "0k" không dấu', () => {
  it('|delta| < 500đ làm tròn về "0k", không ra "−0k" hay "+0k"', () => {
    expect(formatDeltaK(-200)).toBe('0k');
    expect(formatDeltaK(-499)).toBe('0k');
    expect(formatDeltaK(0)).toBe('0k');
    expect(formatDeltaK(499)).toBe('0k');
  });

  it('delta đủ lớn vẫn giữ dấu và đơn vị như trước (không phá hiển thị cũ)', () => {
    expect(formatDeltaK(12000)).toBe('+12k');
    expect(formatDeltaK(-3000)).toBe('−3k');
    expect(formatDeltaK(-800000)).toBe('−800k');
    expect(formatDeltaK(-1500000)).toBe('−1,5tr');
    expect(formatDeltaK(2500000)).toBe('+2,5tr');
  });

  it('chính là helper panel dùng cho dòng "lãi chừng …k/ngày": không bao giờ in dấu trước số 0', () => {
    const fc = priceForecast('gao', productById('gao').sell + 500, { soldPerDay: 3, wantedPerDay: 4 })!;
    const shown = formatDeltaK(fc.profitPerDay - fc.baseProfitPerDay);
    expect(shown).not.toMatch(/^[+−]0k$/);
    if (Math.abs(fc.profitPerDay - fc.baseProfitPerDay) < 500) expect(shown).toBe('0k');
  });
});
