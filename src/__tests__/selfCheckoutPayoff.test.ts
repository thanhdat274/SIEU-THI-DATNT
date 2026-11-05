import { describe, expect, it } from 'vitest';
import { selfCheckoutPayoff, SCO_MAX_ITEMS, SCO_QUICK_SHARE } from '../data/selfCheckoutPayoff';
import { waitMoneyCost } from '../data/advice';

/** GĐ-D — Trục "Siêu thị hóa sâu": QUẦY TỰ THANH TOÁN (self-checkout) — phần còn lại của Khu tự chọn. THUẦN — không đổi state/save/kinh tế/seed. */

describe('selfCheckoutPayoff — quầy tự thanh toán đỡ tắc chờ', () => {
  it('khách ít món ≤ 4 món (hằng số thiết kế, khớp count không-cầm-giỏ trong game)', () => {
    expect(SCO_MAX_ITEMS).toBe(4);
  });

  it('không mất khách vì chờ → không có dòng soi', () => {
    const r = selfCheckoutPayoff(0, 100000);
    expect(r.line).toBeNull();
    expect(r.quickRelieved).toBe(0);
  });

  it('avgPerVisit ≤ 0 → không có dòng soi', () => {
    expect(selfCheckoutPayoff(10, 0).line).toBeNull();
  });

  it('ước số khách mua ít món = waitCount × SCO_QUICK_SHARE, doanh thu giữ lại đúng công thức waitMoneyCost', () => {
    const waitCount = 20, avg = 150000;
    const r = selfCheckoutPayoff(waitCount, avg);
    expect(r.quickRelieved).toBe(Math.round(waitCount * SCO_QUICK_SHARE)); // 7
    expect(r.relievedRevenue).toBe(waitMoneyCost(7, avg).estRevenueLost);
  });

  it('dòng soi nói rõ tay quay tự thanh toán + số tiền gọn (compact)', () => {
    const r = selfCheckoutPayoff(20, 300000); // 7 khách × 300k = 2,1tr → "2,1tr"
    expect(r.line).toContain('tự thanh toán');
    expect(r.line).toContain('≈2,1tr');
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả', () => {
    expect(selfCheckoutPayoff(15, 120000)).toEqual(selfCheckoutPayoff(15, 120000));
  });

  it('dòng soi ≤ 90 code point kể cả số lớn (Luật 9)', () => {
    const r = selfCheckoutPayoff(99, 380000); // 35 khách × 380k = 13,3tr
    if (r.line) expect([...r.line].length).toBeLessThanOrEqual(90);
  });
});
