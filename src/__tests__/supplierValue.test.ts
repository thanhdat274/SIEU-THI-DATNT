import { describe, expect, it } from 'vitest';
import { SUPPLIERS, bulkDiscount, supplierById, supplierSells, unitCost } from '../data/suppliers';
import { casesFor } from '../data/products';
import { cheapestSupplierFor, commitRebateAdvice, effectiveUnitCost } from '../data/supplierValue';

/** GĐ143 "Mối nào rẻ THẬT": đóng nửa GIỮA của vòng nhập hàng — đơn giá ròng sau hoàn tiền từng mối
 *  + món nào mối nào rẻ hơn hôm nay. Helpers THUẦN ĐỌC, không đổi kinh tế/save. */

describe('GĐ143 effectiveUnitCost', () => {
  it('không bớt số lượng lớn (1 món → 1 thùng) thì bằng unitCost', () => {
    const s = supplierById('cho');
    for (let d = 1; d <= 5; d++) {
      expect(effectiveUnitCost(s, 'bia', 1, d)).toBe(unitCost(s, 'bia', d));
      expect(effectiveUnitCost(s, 'nuoc', 1, d)).toBe(unitCost(s, 'nuoc', d));
    }
  });

  it('có bulk thì bằng round(unitCost × (1 − bulkDiscount(cases))) — đúng công thức orderTotal theo món', () => {
    const s = supplierById('cho'); // bulk 3 thùng → −3%, 6 thùng → −6%
    const qty = 90; // chol: caseSize ≥ 30 → 90/30 = 3 thùng
    const cases = casesFor(s.id === 'x' ? 'bia' : 'bia', qty);
    const disc = bulkDiscount(s, casesFor('bia', qty));
    const expectUnit = Math.round(unitCost(s, 'bia', 9) * (1 - disc));
    expect(effectiveUnitCost(s, 'bia', qty, 9)).toBe(expectUnit);
    // Đủ thùng hơn (qty lớn → 6 thùng) phải bớt nhiều hơn (đơn giá rẻ hơn).
    const qty6 = casesFor('bia', qty) >= 6 ? qty : qty * 3;
    const expectUnit6 = Math.round(unitCost(s, 'bia', 9) * (1 - bulkDiscount(s, casesFor('bia', qty6))));
    expect(effectiveUnitCost(s, 'bia', qty6, 9)).toBe(expectUnit6);
    expect(effectiveUnitCost(s, 'bia', qty6, 9)).toBeLessThanOrEqual(effectiveUnitCost(s, 'bia', qty, 9));
  });
});

describe('GĐ143 cheapestSupplierFor', () => {
  it('chọn mối mở khóa khác mối loại trừ có đơn giá hiệu lực rẻ nhất, so với mối đang chọn', () => {
    const day = 12;
    // Ở cấp 18 kho mở → daily/cho/hoatoc/kho đều khả dụng cho 'bia'.
    const curId = 'daily';
    const qty = 1;
    const curUnit = effectiveUnitCost(supplierById(curId), 'bia', qty, day);
    const res = cheapestSupplierFor('bia', qty, day, 18, curId, curUnit)!;
    expect(res.supplier.id).not.toBe(curId);
    // Đúng là min thực tế giữa các mối khác 'daily' mở khóa ở cấp 18.
    const candidates = SUPPLIERS
      .filter((s) => s.id !== curId && s.unlock <= 18)
      .map((s) => ({ id: s.id, unit: effectiveUnitCost(s, 'bia', qty, day) }));
    const min = candidates.reduce((a, b) => (b.unit < a.unit ? b : a));
    expect(res.supplier.id).toBe(min.id);
    expect(res.unit).toBe(min.unit);
    expect(res.delta).toBe(Math.round(curUnit - min.unit));
  });

  it('không trả về mối giỏi nhất khi chính nó bị loại trừ', () => {
    const day = 12;
    const qty = 1;
    // Loại trừ mối đang rẻ nhất → kết quả phải khác mối đó.
    const all = SUPPLIERS.filter((s) => s.unlock <= 18 && supplierSells(s, 'bia')).map((s) => ({
      s, unit: effectiveUnitCost(s, 'bia', qty, day),
    }));
    const cheapestOverall = all.reduce((a, b) => (b.unit < a.unit ? b : a)).s.id;
    const res = cheapestSupplierFor('bia', qty, day, 18, cheapestOverall, null)!;
    expect(res.supplier.id).not.toBe(cheapestOverall);
  });

  it('tôn trọng cấp mở khóa và ngành hàng: mối thiếu ngành không được chọn', () => {
    const day = 12;
    // 'cho' không bán ngành frozen (kem) — dù vẫn đang chọn daily, kết quả phải thuộc mối khác bán được.
    const res = cheapestSupplierFor('kem', 1, day, 18, 'daily', null)!;
    expect(res.supplier.id).not.toBe('cho');
    expect(res.supplier.id).not.toBe('daily');
    // 'daily' (không có categories) bán kem; 'kho'/'hoatoc' cũng bán. Chọn đúng mối rẻ nhất trong số đó.
    const cands = SUPPLIERS
      .filter((s) => s.id !== 'daily' && s.id !== 'cho' && s.unlock <= 18 && supplierSells(s, 'kem'))
      .map((s) => ({ id: s.id, unit: effectiveUnitCost(s, 'kem', 1, day) }));
    const min = cands.reduce((a, b) => (b.unit < a.unit ? b : a));
    expect(res.supplier.id).toBe(min.id);
    expect(cands.some((c) => c.id === res.supplier.id)).toBe(true);
  });

  it('cấp thấp (1) chỉ có daily → loại trừ daily → null (chưa có mối khác để so)', () => {
    expect(cheapestSupplierFor('bia', 1, 12, 1, 'daily', null)).toBeNull();
  });

  it('curUnit truyền rỗng (null) vẫn trả delta so theo đơn giá hiệu lực của mối đang chọn', () => {
    const day = 5;
    const res = cheapestSupplierFor('bia', 1, day, 18, 'daily', null)!;
    const cur = effectiveUnitCost(supplierById('daily'), 'bia', 1, day);
    expect(res.delta).toBe(Math.round(cur - res.unit));
  });
});

describe('GĐ143 commitRebateAdvice', () => {
  it('mối chưa đạt bậc 1 (< 3 triệu tiếp cả ván) → không đủ điều kiện hoàn, gapAfter 0', () => {
    const a = commitRebateAdvice(2_000_000, 100_000, 50_000);
    expect(a.eligible).toBe(false);
    expect(a.gapAfter).toBe(0);
  });

  it('bậc 1: giỏ vượt cam kết tháng → rebateIf = min(projected × 1%, cap), gapAfter 0, eligible', () => {
    const life = 3_000_000; // bậc 1, commit 1.500.000, rate 0.01, cap 150.000
    const monthSpent = 1_400_000;
    const cartTotal = 200_000;
    const a = commitRebateAdvice(life, monthSpent, cartTotal);
    expect(a.eligible).toBe(true);
    expect(a.projectedSpent).toBe(1_600_000);
    expect(a.gapAfter).toBe(0); // đã lấp đủ cam kết
    expect(a.rebateIf).toBe(Math.min(Math.round(1_600_000 * 0.01), 150_000)); // 16.000
    expect(a.rebateBase).toBe(0); // chưa đạt cam kết nên nền = 0
  });

  it('bậc 1 chưa đạt cam kết → gapAfter dương, rebateIf = 0 (chưa đủ cam kết)', () => {
    const a = commitRebateAdvice(3_000_000, 1_000_000, 200_000);
    expect(a.eligible).toBe(true);
    expect(a.gapAfter).toBe(1_500_000 - 1_200_000);
    expect(a.rebateIf).toBe(0);
  });

  it('đã đạt cam kết từ đầu tháng → rebateIf > rebateBase (giỏ góp thêm vào hạn mức hoàn)', () => {
    const life = 3_000_000;
    const monthSpent = 2_000_000;
    const base = commitRebateAdvice(life, monthSpent, 0);
    const withCart = commitRebateAdvice(life, monthSpent, 300_000);
    expect(withCart.rebateBase).toBe(Math.min(Math.round(2_000_000 * 0.01), 150_000)); // 20.000
    expect(withCart.rebateIf).toBe(Math.min(Math.round(2_300_000 * 0.01), 150_000)); // 23.000
    expect(withCart.rebateIf).toBeGreaterThan(withCart.rebateBase);
  });

  it('áp trần cap: doanh tháng rất lớn → rebateIf = cap, không vượt', () => {
    const a = commitRebateAdvice(3_000_000, 30_000_000, 1_000_000);
    expect(a.eligible).toBe(true);
    expect(a.rebateIf).toBe(150_000); // 31.000.000 × 1% = 310.000 → cap 150.000
    expect(a.gapAfter).toBe(0);
  });
});
