import { describe, expect, it } from 'vitest';
import { migrateTiers } from '../core/stock';
import { furnitureDef, slotCount } from '../data/furniture';
import type { Furniture, Tier } from '../core/gameTypes';

/** Một món nội thất kệ để thử migration. */
function shelf(tiers: Tier[]): Furniture {
  return { uid: 1, type: 'shelf', x: 0, z: 0, rot: 0, tiers };
}

/**
 * Bản lưu LEGACY: mỗi tầng chỉ một món (đúng `def.tiers` entry — số entry này khiến
 * `f.tiers.length === def.tiers` nên migrateTiers chia mỗi tầng thành `def.slots` ô).
 * Truyền các hàng có nội dung; các hàng còn lại để trống để đủ số tầng.
 */
function legacyShelf(...rows: Tier[]): Furniture {
  const def = furnitureDef('shelf');
  const out: Tier[] = [];
  for (let r = 0; r < def.tiers; r++) out.push(rows[r] ?? { productId: null, count: 0, lots: [] });
  return shelf(out);
}

const EMPTY_SLOT: Tier = { productId: null, count: 0, lots: [] };

describe('migrateTiers — nạp bản lưu cũ (Luật 5: không làm hỏng save)', () => {
  it('kệ đã đúng số ô (tầng × ô) thì giữ nguyên, không đổi tham chiếu', () => {
    const f = shelf(Array.from({ length: slotCount('shelf') }, () => ({ productId: null, count: 0 })));
    expect(migrateTiers(f)).toBe(f);
  });

  it('đã theo dạng tầng × ô nhưng số ô đổi (kệ rộng hơn): bù ô trống cho đủ', () => {
    const f = shelf([{ productId: 'mi', count: 4, lots: [{ qty: 4, life: 45 }] }]);
    const out = migrateTiers(f);
    expect(out.tiers).toHaveLength(slotCount('shelf'));
    expect(out.tiers[0]).toEqual({ productId: 'mi', count: 4, lots: [{ qty: 4, life: 45 }] });
    for (let i = 1; i < out.tiers.length; i++) expect(out.tiers[i]).toEqual({ productId: null, count: 0 });
  });

  it('đã theo dạng tầng × ô nhưng số ô đổi (kệ hẹp hơn): cắt ô thừa, giữ nguyên thứ tự hàng', () => {
    const fill = Array.from({ length: slotCount('shelf') }, (): Tier => ({ productId: 'nuoc', count: 6, lots: [{ qty: 6, life: 90 }] }));
    const out = migrateTiers(shelf([...fill, { productId: 'mi', count: 4, lots: [{ qty: 4, life: 45 }] }]));
    expect(out.tiers).toHaveLength(slotCount('shelf'));
    expect(out.tiers[0].productId).toBe('nuoc');
    expect(out.tiers[slotCount('shelf') - 1].productId).toBe('nuoc');
  });

  // ── Case [C]: BẢN LƯU LEGACY — mỗi tầng chỉ MỘT món, chia ra các ô ──
  it('legacy: tầng có 10 món, slots 4 × capacity 6 → ô [6, 4, 0, 0]', () => {
    const def = furnitureDef('shelf');
    const tiers = migrateTiers(legacyShelf({ productId: 'mi', count: 10, lots: [{ qty: 10, life: 45 }] })).tiers;
    expect(tiers).toHaveLength(3 * def.slots);
    expect(tiers[0]).toEqual({ productId: 'mi', count: 6, lots: [{ qty: 6, life: 45 }] });
    expect(tiers[1]).toEqual({ productId: 'mi', count: 4, lots: [{ qty: 4, life: 45 }] });
    expect(tiers[2]).toEqual({ ...EMPTY_SLOT });
    expect(tiers[3]).toEqual({ ...EMPTY_SLOT });
    // Các hàng sau để trống (legacy rỗng) → toàn ô trống
    expect(tiers[4]).toEqual({ ...EMPTY_SLOT });
    expect(tiers[11]).toEqual({ ...EMPTY_SLOT });
  });

  it('legacy: tầng có ít hơn capacity → ô 0 giữ món, các ô sau trống', () => {
    const tiers = migrateTiers(legacyShelf({ productId: 'nuoc', count: 3, lots: [{ qty: 3, life: 90 }] })).tiers;
    expect(tiers[0]).toEqual({ productId: 'nuoc', count: 3, lots: [{ qty: 3, life: 90 }] });
    for (let i = 1; i < furnitureDef('shelf').slots; i++) expect(tiers[i]).toEqual({ ...EMPTY_SLOT });
  });

  it('legacy: lô chia theo hạn — lô hết hạn sớm ra ô trước (takeOldest qua các ô)', () => {
    // 12 món: 4 món hạn 10 ngày + 8 món hạn 45 ngày → ô 0 lấy 6 (4 hạn 10 + 2 hạn 45), ô 1 lấy nốt 6 hạn 45
    const tiers = migrateTiers(
      legacyShelf({ productId: 'mi', count: 12, lots: [{ qty: 4, life: 10 }, { qty: 8, life: 45 }] }),
    ).tiers;
    expect(tiers[0].count).toBe(6);
    expect(tiers[0].lots).toEqual([{ qty: 4, life: 10 }, { qty: 2, life: 45 }]);
    expect(tiers[1]).toEqual({ productId: 'mi', count: 6, lots: [{ qty: 6, life: 45 }] });
    expect(tiers[2]).toEqual({ ...EMPTY_SLOT });
    expect(tiers[3]).toEqual({ ...EMPTY_SLOT });
  });

  it('legacy: món vừa đúng 1 ô (count = capacity) → ô 0 đầy khít, ô sau trống', () => {
    const tiers = migrateTiers(legacyShelf({ productId: 'mi', count: 6, lots: [{ qty: 6, life: 45 }] })).tiers;
    expect(tiers[0]).toEqual({ productId: 'mi', count: 6, lots: [{ qty: 6, life: 45 }] });
    for (let i = 1; i < furnitureDef('shelf').slots; i++) expect(tiers[i]).toEqual({ ...EMPTY_SLOT });
  });

  it('legacy: nhiều tầng legacy chia đủ (3 tầng × 4 ô = 12 ô), hàng đúng tầng', () => {
    const tiers = migrateTiers(
      legacyShelf(
        { productId: 'mi', count: 10, lots: [{ qty: 10, life: 45 }] },
        { productId: 'nuoc', count: 3, lots: [{ qty: 3, life: 90 }] },
      ),
    ).tiers;
    expect(tiers).toHaveLength(slotCount('shelf'));
    // Tầng 1 (mi) ở ô 0–3
    expect(tiers[0].productId).toBe('mi');
    expect(tiers[3].productId).toBeNull();
    // Tầng 2 (nuoc) ở ô 4–7
    expect(tiers[4]).toEqual({ productId: 'nuoc', count: 3, lots: [{ qty: 3, life: 90 }] });
    expect(tiers[5].productId).toBeNull();
    // Tầng 3 trống: ô 8–11
    expect(tiers[8].productId).toBeNull();
    expect(tiers[11].productId).toBeNull();
  });
});
