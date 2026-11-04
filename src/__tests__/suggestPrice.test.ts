import { describe, expect, it } from 'vitest';
import { lowPricePull, priceBuyOdds, priceSideMark, referenceSell, suggestPrice } from '../data/pricing';

describe('lowPricePull — bề mặt "giá rẻ kéo khách" (GĐ1224)', () => {
  // gao sell 100000; demandPriceFactor = 1 + 0.5×(1−ratio), cap 1.15
  it('bằng giá thị trường → không kéo thêm (active false, pct 0)', () => {
    expect(lowPricePull('gao', 100000)).toEqual({ active: false, pct: 0 });
  });
  it('thấp hơn 20% thị trường (80000) → +10% khách ghé', () => {
    expect(lowPricePull('gao', 80000)).toEqual({ active: true, pct: 10 });
  });
  it('hạ sâu quá → kẹp trần lowPriceDemandCap +15% (không tăng mãi)', () => {
    // ratio ~0.1 → 1 + 0.5×0.9 = 1.45 → cap 1.15 → +15%
    expect(lowPricePull('gao', 10000)).toEqual({ active: true, pct: 15 });
    expect(lowPricePull('gao', 10000).pct).toBeLessThanOrEqual(15);
  });
  it('helper thuần: cùng input ra cùng kết quả (không đổi theo state)', () => {
    expect(lowPricePull('gao', 85000)).toEqual(lowPricePull('gao', 85000));
  });
});

describe('priceSideMark — bề mặt hai phía giá trên ô giá (GĐ1225)', () => {
  // gao sell 100000, referenceSell=100000; nhạy giá 1.1
  it('rẻ hơn thị trường → báo phía "low" với % khách ghé (không nhắc đắt)', () => {
    const mk = priceSideMark('gao', 80000);
    expect(mk).not.toBeNull();
    expect(mk!.side).toBe('low');
    expect(mk!.line).toContain('+10% khách ghé');
    expect(mk!.line).not.toContain('đơn được mua');
  });
  it('đắt hơn thị trường → báo phía "high" với % đơn còn chịu mua (không nhắc rẻ)', () => {
    // 120000 → keep 0.78 → ~78% đơn được mua
    const mk = priceSideMark('gao', 120000);
    expect(mk!.side).toBe('high');
    expect(mk!.line).toContain('~78% đơn được mua');
    expect(mk!.line).not.toContain('khách ghé');
  });
  it('bằng giá thị trường → null (không ồn; giá hợp lý đừng nhắc)', () => {
    expect(priceSideMark('gao', 100000)).toBeNull();
  });
  it('helper thuần: cùng input ra cùng kết quả', () => {
    expect(priceSideMark('gao', 110000)).toEqual(priceSideMark('gao', 110000));
  });
});

describe('priceBuyOdds — bề mặt "giá cao ăn vào đơn" (GĐ1222)', () => {
  // gao: sell 100000, độ nhạy 1.1
  it('bằng/thấp hơn giá thị trường → keep 1 (ai cũng mua), reference = giá thị trường', () => {
    expect(priceBuyOdds('gao', 100000)).toEqual({ keep: 1, reference: 100000 });
  });
  it('đắt hơn thị trường → keep giảm theo độ nhạy (không xuống dưới trần 0.1)', () => {
    // 120000: ratio 1.2, gao nhạy 1.1 → keep = 1 − 1.1×0.2 = 0.78
    const o = priceBuyOdds('gao', 120000);
    expect(o.reference).toBe(100000);
    expect(o.keep).toBeCloseTo(0.78, 5);
  });
  it('càng đắt càng khó giữ khách, nhưng không âm (kẹp trần minKeepChance)', () => {
    // 200000: ratio 2, 1 − 1.1×1 = −0.1 → kẹp về 0.1
    const o = priceBuyOdds('gao', 200000);
    expect(o.keep).toBeCloseTo(0.1, 5);
    expect(o.keep).toBeGreaterThanOrEqual(0);
  });
  it('món nhạy giá cao (nước suối) mất khách nhanh hơn gạo khi cùng tăng %', () => {
    // cùng ratio 1.2: gạo nhạy 1.1 → keep 0.78; nước nhạy 2.6 → keep 0.48
    const ratio = 1.2;
    const g = priceBuyOdds('gao', referenceSell('gao') * ratio);
    const n = priceBuyOdds('nuoc', referenceSell('nuoc') * ratio);
    expect(n.keep).toBeLessThan(g.keep);
    expect(g.keep).toBeCloseTo(0.78, 5);
  });
});

describe('suggestPrice — gợi ý giá mỗi ngày (lõi bán hàng)', () => {
  // gao: sell 100000, buy 80000 → ref mặc định (marketIndex=1) = 100000, margin tại 100000 = 0.2 > 0.15
  it('chưa đủ dữ liệu (cả sold lẫn wanted undefined) → giữ giá', () => {
    expect(suggestPrice('gao', 100000, undefined, undefined)).toEqual({ action: 'hold', price: 100000, reason: 'Chưa đủ dữ liệu bán, giữ giá.' });
  });

  it('khách hỏi nhiều mà chê đắt (turnedAway) → hạ giá về mức gợi ý', () => {
    // wanted 6, sold 2 < 6×0.5, giá 110000 > ref 100000
    expect(suggestPrice('gao', 110000, 2, 6)).toEqual({ action: 'cut', price: 100000, reason: 'Khách hỏi nhiều mà chê đắt, nên hạ giá.' });
  });

  it('bán chạy + giá dưới trần → tăng giá (bước 500)', () => {
    const r = suggestPrice('gao', 110000, 6, 6);
    expect(r.action).toBe('raise');
    expect(r.price).toBe(126500); // 110000 × 1.15 làm tròn bước 500
  });

  it('bán chậm + lời còn đủ → hạ giá nhẹ kích cầu (không xuống dưới sàn lãi 5%)', () => {
    const r = suggestPrice('gao', 100000, 0, 0);
    expect(r).toEqual({ action: 'cut', price: 84000, reason: 'Bán chậm, hạ giá nhẹ để kích cầu.' });
  });

  it('bán ổn (không quá nhanh/quá chậm, không bị chê) → giữ giá', () => {
    expect(suggestPrice('gao', 100000, 2, 2).action).toBe('hold');
    expect(suggestPrice('gao', 100000, 2, 2).reason).toBe('Bán ổn, giữ giá.');
  });

  it('hết hàng (bán 0 mà có người hỏi) — không bị coi là "chậm" → giữ, không hạ', () => {
    // sold 0, wanted 2: chờ cấp hàng, CHƯA nên hạ giá vì hạ cũng không bán được
    expect(suggestPrice('gao', 100000, 0, 2)).toEqual({ action: 'hold', price: 100000, reason: 'Bán ổn, giữ giá.' });
  });

  it('cùng suy luận có tolerance hợp lệ (0..1): tolerance ≥1 coi như 1', () => {
    // tolerance 2 bị kẹp về 1 → kết quả như mặc định
    expect(suggestPrice('gao', 110000, 2, 6, 2)).toEqual(suggestPrice('gao', 110000, 2, 6));
  });
});
