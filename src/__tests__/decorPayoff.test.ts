import { describe, expect, it } from 'vitest';
import { decorPayoff, decorPayoffLine, VISIT_BASE } from '../data/decorPayoff';
import { customersPerDay } from '../data/levels';

// GĐ2214 — định lượng lợi ích điểm 🩷 decor: decorBoost cộng vào nền lượt ghé như repVisitBonus.
describe('GĐ2214 — decorPayoff (trang trí kéo bao nhiêu khách/tiền)', () => {
  it('công thức boost đúng decorVisitBoost: (decorScore/100)×(sao/5), nền 0.5', () => {
    const p = decorPayoff(100, 5, 10);
    expect(p.boost).toBe(1); // (100/100)×(5/5)
    expect(p.pct).toBe(200); // 1 / 0.5 = 200%
    const cpd = customersPerDay(10);
    expect(p.extraKhach).toBe(Math.round(1 * cpd));
  });

  it('0 điểm decor → không kéo thêm gì', () => {
    const p = decorPayoff(0, 5, 10);
    expect(p.boost).toBe(0);
    expect(p.extraKhach).toBe(0);
    expect(p.moneyPerDay).toBe(0);
  });

  it('decor chỉ phát huy khi danh tiếng tốt: 2.5★ thì hiệu quả còn một nửa', () => {
    const five = decorPayoff(100, 5, 10);
    const twoHalf = decorPayoff(100, 2.5, 10);
    expect(twoHalf.boost).toBe(0.5); // 2.5/5 = ½
    expect(twoHalf.extraKhach).toBe(Math.round(five.extraKhach / 2));
  });

  it('ước tiền/ngày theo phí chi tiêu bình quân (như repMoney)', () => {
    const p = decorPayoff(100, 5, 10, 20000);
    expect(p.moneyPerDay).toBe(Math.round(p.extraKhach * 20000));
  });

  it('bước 10🩷: thêm ~0.1×(sao/5) lượt → khách/ngày biên', () => {
    const p = decorPayoff(100, 5, 10);
    const cpd = customersPerDay(10);
    expect(p.stepKhach).toBe(Math.round(0.1 * cpd)); // (10/100)×(5/5)
    expect(p.stepMoney).toBe(Math.round(p.stepKhach * 0));
  });

  it('decorPayoffLine đọc được "khách/ngày"', () => {
    const line = decorPayoffLine(decorPayoff(50, 5, 10));
    expect(line).toContain('khách/ngày');
    expect(line).toContain('🩷');
    expect(VISIT_BASE).toBe(0.5);
  });
});
