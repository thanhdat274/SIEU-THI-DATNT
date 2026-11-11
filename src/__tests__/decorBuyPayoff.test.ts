import { describe, expect, it } from 'vitest';
import { decorBuyPayoff, decorBuyPayoffLine } from '../data/decorBuyPayoff';
import { decorVisitBoost } from '../data/layout';
import { customersPerDay } from '../data/levels';
import { FURNITURE, furnitureDef } from '../data/furniture';

// GĐ2216 — định lượng mua thêm 1 món đồ decor (+Δ🩷 → khách/đ mỗi ngày biên).
describe('GĐ2216 — decorBuyPayoff (món trang trí đáng bao nhiêu)', () => {
  it('boost biên = decorVisitBoost(Δ, sao), khách = round(boost × cpd(level))', () => {
    const p = decorBuyPayoff(50000, 6, 5, 30);
    expect(p.boost).toBeCloseTo(decorVisitBoost(6, 5), 6);
    expect(p.extraKhach).toBe(Math.round(p.boost * customersPerDay(30)));
  });

  it('decor càng cao sao càng phát huy: 2.5★ thì hiệu quả nửa so với 5★', () => {
    const five = decorBuyPayoff(50000, 6, 5, 30);
    const twoHalf = decorBuyPayoff(50000, 6, 2.5, 30);
    expect(twoHalf.boost).toBeCloseTo(0.03, 6); // (6/100)×(2.5/5)
    expect(twoHalf.extraKhach).toBe(Math.round(five.extraKhach / 2));
  });

  it('đồ không decor (Δ=0) → không kéo thêm; dòng rỗng', () => {
    const p = decorBuyPayoff(0, 0, 5, 30, 20000);
    expect(p.decorDelta).toBe(0);
    expect(p.boost).toBe(0);
    expect(p.extraKhach).toBe(0);
    expect(p.moneyPerDay).toBe(0);
    expect(decorBuyPayoffLine(p)).toBe('');
  });

  it('moneyPerDay = round(extraKhach × avgPerVisit); 0 nếu không kê phí', () => {
    const kh = decorBuyPayoff(50000, 6, 5, 30, 20000).extraKhach;
    expect(decorBuyPayoff(50000, 6, 5, 30, 20000).moneyPerDay).toBe(Math.round(kh * 20000));
    expect(decorBuyPayoff(50000, 6, 5, 30).moneyPerDay).toBe(0);
  });

  it('mọi món decor có thật đều ra dòng đọc được dương (không dead): Δ>0 cho món decor', () => {
    const decorItems = FURNITURE.filter((f) => (furnitureDef(f.type).decor ?? 0) > 0);
    expect(decorItems.length).toBeGreaterThan(0);
    for (const f of decorItems) {
      const p = decorBuyPayoff(furnitureDef(f.type).price ?? 0, furnitureDef(f.type).decor ?? 0, 5, 30, 20000);
      expect(p.decorDelta).toBeGreaterThan(0);
      const line = decorBuyPayoffLine(p);
      expect(line).toContain('+');
      expect(line).not.toBe('');
    }
  });
});
