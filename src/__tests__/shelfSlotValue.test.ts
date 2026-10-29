import { describe, expect, it } from 'vitest';
import { shelfSlotValue, SLOT_ACTIONABLE_ON_SHELF, SLOT_SLOW_RATIO } from '../data/shelfSlotValue';
import type { ItemHealth } from '../data/analytics';

/** Factory nhanh cho ItemHealth — chỉ cần vài trường helper dùng. */
const h = (id: string, o: Partial<ItemHealth>): ItemHealth => ({
  id, name: id, qty30: 0, profit30: 0, revenue30: 0, profit21: 0, margin: 0,
  dailyQty: 0, daysLeft: null, spoilShare: 0, lostShare: 0, abc: 'C', ...o,
});

describe('shelfSlotValue', () => {
  it('bỏ qua món không bày trên kệ (onShelf = 0)', () => {
    const r = shelfSlotValue([h('gao', { profit30: 30000 })], { gao: 0 });
    expect(r.items).toHaveLength(0);
    expect(r.actionable).toBe(false);
  });

  it('tính perSlot = profitPerDay / onShelf', () => {
    const r = shelfSlotValue([h('gao', { profit30: 3000 })], { gao: 3 });
    expect(r.items[0].profitPerDay).toBeCloseTo(100, 5);
    expect(r.items[0].perSlot).toBeCloseTo(100 / 3, 5);
    expect(r.actionable).toBe(false);
  });

  it('gắn cờ lose cho món đang lỗ dù chỉ bày 1 ô', () => {
    const r = shelfSlotValue([h('kem', { profit30: -500 })], { kem: 1 });
    expect(r.slow.map((s) => s.id)).toEqual(['kem']);
    expect(r.actionable).toBe(true);
  });

  it('gắn cờ slow cho món bày đủ ô nhưng perSlot dưới nửa món khoẻ nhất', () => {
    const list = [
      h('gao', { profit30: 60000 }),   // perSlot = 2000/3 ≈ 667
      h('banh', { profit30: 1200 }),   // perSlot = 40/3 ≈ 13 << 333 (nửa best)
    ];
    const r = shelfSlotValue(list, { gao: 3, banh: 3 });
    expect(r.best).toBeCloseTo(2000 / 3, 5);
    const slowId = r.slow.filter((s) => s.flag === 'slow').map((s) => s.id);
    expect(slowId).toContain('banh');
  });

  it('không cờ slow khi món chỉ bày 1–2 ô (chưa đủ là chiếm chỗ)', () => {
    const list = [
      h('gao', { profit30: 60000 }),
      h('banh', { profit30: 100 }),
    ];
    const r = shelfSlotValue(list, { gao: 3, banh: 2 });
    expect(r.slow.filter((s) => s.flag === 'slow')).toHaveLength(0);
    expect(r.slow.map((s) => s.flag)).not.toContain('slow');
  });

  it('hằng số ngưỡng có giá trị dùng được', () => {
    expect(SLOT_ACTIONABLE_ON_SHELF).toBe(3);
    expect(SLOT_SLOW_RATIO).toBe(0.5);
  });
});
