import { describe, expect, it } from 'vitest';
import { ADS, adBoost, adPayoff, adPayoffLine } from '../data/advertising';
import { decorVisitBoost } from '../data/layout';
import { customersPerDay } from '../data/levels';

// GĐ2219 — quảng cáo: bỏ tiền kéo khách N ngày; helper thuần đọc, an toàn sim.
describe('GĐ2219 — advertising (quảng cáo kéo khách)', () => {
  it('adBoost: chưa có / hết hạn → 0; đang hiệu lực → boost của đợt', () => {
    const def = ADS[0]; // tờ rơi boost 20
    expect(adBoost(undefined, 50)).toBe(0);
    expect(adBoost({ defId: def.id, until: 55 }, 55)).toBe(def.boost);
    expect(adBoost({ defId: def.id, until: 55 }, 56)).toBe(0); // hết hạn
  });

  it('adPayoff khớp decorVisitBoost: boost=(def.boost/100)×(sao/5), khách=round(boost×cpd)', () => {
    const def = ADS[0];
    const p = adPayoff(def, 5, 42);
    expect(p.boost).toBeCloseTo(decorVisitBoost(def.boost, 5), 6);
    expect(p.extraKhach).toBe(Math.round(p.boost * customersPerDay(42)));
    expect(p.totalKhach).toBe(p.extraKhach * def.days);
  });

  it('tiền/đợt = moneyPerDay×days; roiPct theo (totalMoney−cost)/cost', () => {
    const def = ADS[0]; // cost 60000, days 2
    const khach = Math.round(decorVisitBoost(20, 4) * customersPerDay(42));
    const p = adPayoff(def, 4, 42, 20000);
    expect(p.moneyPerDay).toBe(Math.round(khach * 20000));
    expect(p.totalMoney).toBe(p.moneyPerDay * 2);
    expect(p.roiPct).toBe(Math.round(((p.totalMoney - def.cost) / def.cost) * 100));
  });

  it('mọi đợt mở cấp > golden 30 → autoplay không bao giờ tự bấm, sim đứng', () => {
    for (const def of ADS) expect(def.unlock).toBeGreaterThan(30);
  });

  it('adPayoffLine đọc được khách/ngày và đ/ngày', () => {
    const line = adPayoffLine(adPayoff(ADS[0], 5, 42, 20000));
    expect(line).toContain('khách/ngày');
    expect(line).toContain('đ');
  });
});
