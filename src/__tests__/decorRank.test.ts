import { describe, expect, it } from 'vitest';
import { decorRank, decorRankLine } from '../data/decorRank';
import { decorBuyPayoff } from '../data/decorBuyPayoff';
import { decorVisitBoost } from '../data/layout';
import { customersPerDay } from '../data/levels';
import { FURNITURE, furnitureDef } from '../data/furniture';

// GĐ2217 — xếp món decor theo hiệu quả vốn (khách kéo / 100.000đ mua).
describe('GĐ2217 — decorRank (mua decor nào trước)', () => {
  it('chỉ chọn món decor đang mở khóa; eff = khachFrac/price×100k, xếp giảm dần', () => {
    const rows = decorRank(10, 3, 0);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].eff).toBeGreaterThanOrEqual(rows[i].eff);
    for (const r of rows) {
      const ft = r.type as Parameters<typeof furnitureDef>[0];
      expect(furnitureDef(ft).decor ?? 0).toBeGreaterThan(0);
      expect(furnitureDef(ft).unlock).toBeLessThanOrEqual(10);
      const frac = decorVisitBoost(r.decorDelta, 3) * customersPerDay(10);
      expect(r.khachFrac).toBeCloseTo(frac, 6);
      expect(r.eff).toBeCloseTo(Math.round((frac / r.price) * 100_000 * 10) / 10, 6);
    }
  });

  it('bỏ món đã sở hữu khỏi danh-sách-mua-trước', () => {
    const rows = decorRank(10, 3, 0, new Set([rowsOfMostExpensiveUnlocked(10)]));
    const bought = rowsOfMostExpensiveUnlocked(10);
    expect(rows.some((r) => r.type === bought)).toBe(false);
    expect(decorRank(10, 3, 0).length).toBe(decorRank(10, 3, 0, new Set()).length);
  });

  it('khachFrac (chưa làm tròn) khớp decorBuyPayoff.extraKhach khi làm tròn', () => {
    const rows = decorRank(10, 3, 0).filter((r) => r.extraKhach > 0);
    for (const r of rows) {
      expect(r.extraKhach).toBe(Math.round(r.khachFrac));
    }
  });

  it('decorRankLine có top món hiệu quả vốn nhất, đọc được khách/100.000₫', () => {
    const rows = decorRank(10, 3, 0);
    const line = decorRankLine(rows, 2);
    expect(line).toContain('Mua decor trước');
    expect(line).toContain('khách');
    if (rows.length) expect(line).toContain(rows[0].name);
    expect(decorRankLine([], 2)).toBe('');
  });
});

/** Kiểu có giá decor đắt nhất trong số đang mở khóa (dùng làm "đã sở hữu" trong test bỏ qua). */
function rowsOfMostExpensiveUnlocked(level: number): string {
  let best = '';
  let bestPrice = -1;
  for (const f of FURNITURE) {
    const d = furnitureDef(f.type);
    if ((d.decor ?? 0) > 0 && d.unlock <= level && (d.price ?? 0) > bestPrice) {
      bestPrice = d.price ?? 0;
      best = f.type;
    }
  }
  return best;
}
