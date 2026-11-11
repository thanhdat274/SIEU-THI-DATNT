import { describe, expect, it } from 'vitest';
import { warehouseKeeperPayoff, WAREHOUSE_SAVE_MIN } from '../data/warehouseKeeperPayoff';
import { WAREHOUSE_KEEP_PER_STAR } from '../data/staff';

// GĐ2221 — quản lý kho TỰ GIẢM HÀNG HỎNG: cứu được bao nhiêu đêm qua.
// Helper thuần đọc, an toàn sim: không đổi state/save/kinh tế (chỉ đảo đúng công thức spoilOvernight).
describe('GĐ2221 — warehouseKeeperPayoff (quản lý kho giảm hàng hỏng)', () => {
  it('đảo đúng công thức keeperMgr: hqk = max(0.1, 1 − 0.06×skill)', () => {
    // 3★ → 1−0.06×3 = 0.82
    const p = warehouseKeeperPayoff({ spoiltCost: 1_000_000, bestSkill: 3 });
    expect(p.keeperMgr).toBeCloseTo(1 - WAREHOUSE_KEEP_PER_STAR * 3, 6);
  });

  it('cứu = totalCost × (1/hqk − 1): đêm hỏng 1tr với quản lý 5★ (hqk 0.7) cứu ~428.571đ', () => {
    const p = warehouseKeeperPayoff({ spoiltCost: 1_000_000, bestSkill: 5 });
    // không quản lý → 1/0.7×1tr = 1.428.571; cứu = 428.571
    expect(p.saved).toBe(Math.round(1_000_000 * (1 / 0.7 - 1)));
    expect(p.ok).toBe(true);
    expect(p.line).toContain('cứu');
  });

  it('chưa có quản lý kho (bestSkill 0) → không nêu (ok:false), dù có hỏng', () => {
    const p = warehouseKeeperPayoff({ spoiltCost: 5_000_000, bestSkill: 0 });
    expect(p.ok).toBe(false);
    expect(p.line).toBe('');
  });

  it('đêm sạch (hỏng 0) → không nêu (không có gì để cứu)', () => {
    const p = warehouseKeeperPayoff({ spoiltCost: 0, bestSkill: 5 });
    expect(p.ok).toBe(false);
  });

  it('đêm hỏng nhỏ dưới ngưỡng → không nêu (tránh nhiễu nhưng keeperMgr vẫn đúng)', () => {
    const p = warehouseKeeperPayoff({ spoiltCost: WAREHOUSE_SAVE_MIN - 1, bestSkill: 4 });
    expect(p.ok).toBe(false);
    // vẫn tính đúng đảo ngược
    expect(p.keeperMgr).toBeCloseTo(1 - WAREHOUSE_KEEP_PER_STAR * 4, 6);
  });

  it('giờ tốt hơn: tay nghề cao cứu nhiều hơn cho cùng đêm hỏng', () => {
    const low = warehouseKeeperPayoff({ spoiltCost: 1_000_000, bestSkill: 1 });
    const high = warehouseKeeperPayoff({ spoiltCost: 1_000_000, bestSkill: 5 });
    expect(high.saved).toBeGreaterThan(low.saved);
  });

  it('line ≤ 90 ký tự, nêu tay nghề + % chậm hỏng', () => {
    const p = warehouseKeeperPayoff({ spoiltCost: 1_500_000, bestSkill: 3 });
    expect(p.ok).toBe(true);
    expect(p.line.length).toBeLessThanOrEqual(90);
    expect(p.line).toContain('3★');
    expect(p.line).toContain('%');
  });
});
