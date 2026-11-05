import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, departmentsUnlockedAtTier, departmentStatus, tierName } from '../data/departments';
import { SHOP_TIERS } from '../data/shopTiers';
import type { Category } from '../data/products';
import { isCookStation, type FurnitureType } from '../data/furniture';

/** GĐ-A — Trục "Siêu thị hóa sâu" (nền): bảng ngành hàng siêu thị + trạng thái kích hoạt theo nội thất.
 *  THUẦN — chỉ dữ liệu + helper đọc, không đổi state/save/kinh tế/seed. */

const CATS: Category[] = ['dry', 'drink', 'cold', 'frozen', 'household', 'fresh', 'meat'];
const ALL_TYPES = new Set<FurnitureType>((
  ['shelf', 'bigShelf', 'fridge', 'freezer', 'produce', 'meat_counter', 'checkout', 'cartStation', 'plant', 'wall'] as FurnitureType[]
).concat(
  ['hot_kettle', 'food_grill', 'blender', 'drink_counter', 'fryer', 'sugarcane_press', 'rice_station', 'steamer', 'gift_wrap'] as FurnitureType[],
));

describe('departments — ngành hàng siêu thị', () => {
  it('mọi ngành mở ở một bậc tiệm hợp lệ trong SHOP_TIERS', () => {
    for (const d of DEPARTMENTS) {
      expect(d.fromTier).toBeGreaterThanOrEqual(0);
      expect(d.fromTier).toBeLessThan(SHOP_TIERS.length);
    }
  });

  it('mọi ngành có ít nhất 1 nội thất chủ chốt hợp lệ', () => {
    for (const d of DEPARTMENTS) {
      expect(d.keyFurniture.length).toBeGreaterThan(0);
      for (const f of d.keyFurniture) expect(ALL_TYPES.has(f)).toBe(true);
    }
  });

  it('nhóm sản phẩm của ngành đều là Category hợp lệ', () => {
    for (const d of DEPARTMENTS) {
      expect(d.categories.length).toBeGreaterThan(0);
      for (const c of d.categories) expect(CATS).toContain(c);
    }
  });

  it('ngành mở đúng theo bậc: bậc 1 = Khu mát & đông lạnh; bậc 3 = thịt cá + tự chọn', () => {
    const b1 = departmentsUnlockedAtTier(1).map((d) => d.id);
    expect(b1).toContain('mat_dong');
    const b3 = departmentsUnlockedAtTier(3).map((d) => d.id);
    expect(b3).toContain('thit_ca');
    expect(b3).toContain('tu_chon');
  });

  it('kích hoạt khi đặt ít nhất 1 nội thất chủ chốt', () => {
    const status = departmentStatus([{ type: 'meat_counter' }]);
    expect(status.thit_ca.activated).toBe(true);
    expect(status.tu_chon.activated).toBe(false);
  });

  it('chưa đặt đồ → ngành chưa kích hoạt', () => {
    const status = departmentStatus([]);
    for (const d of DEPARTMENTS) expect(status[d.id].activated).toBe(false);
  });

  it('đếm nội thất phụ trợ hỗ trợ ngành', () => {
    const status = departmentStatus([{ type: 'meat_counter' }, { type: 'freezer' }, { type: 'fridge' }]);
    expect(status.thit_ca.supportCount).toBe(2); // freezer + fridge
    expect(status.mat_dong.supportCount).toBe(1); // freezer
  });

  it('tierName hiện đúng tên bậc tiệm', () => {
    expect(tierName(0)).toBe('Tiệm nhỏ đầu ngõ');
    expect(tierName(6)).toBe('Đại siêu thị');
  });

  it('sẵn sàng cho bước siêu thị hóa: đã có ngành thịt cá + tự chọn ở bậc 3 (Mini mart)', () => {
    expect(SHOP_TIERS[3].name).toBe('Mini mart');
  });
});
