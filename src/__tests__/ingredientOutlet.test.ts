import { describe, it, expect } from 'vitest';
import { PRODUCTS } from '../data/products';
import { RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { QUAN_RECIPES } from '../data/quanRecipes';

/**
 * GĐ1432 — khóa thành quả GĐ1404–1431: mọi nguyên liệu tươi/thịt/mát/đông lạnh đều có ít nhất một
 * lối ra (công thức bếp hoặc món quán), trừ danh sách hàng bán lẻ thuần mà Leader đã quyết giữ nguyên.
 * Thêm hàng tươi mới mà quên lối ra → test đỏ, buộc chọn: thêm công thức hoặc ghi vào danh sách dưới.
 */
import { LATE_GAME_PRODUCTS } from '../data/lateGameProducts';
const RETAIL_ONLY = new Set([
  ...LATE_GAME_PRODUCTS.map((p) => p.id), // hàng cao cấp cuối game (cấp 87–200): bán lẻ nguyên hộp
  'dochin', 'sinhto', 'banhkem', // đồ ăn/uống làm sẵn
  'x_kem_oc_que', 'x_banh_bao', // hàng đông lạnh ăn liền (bánh bao đã có lối ra qua 'banhbao')
  'x_dua_gia', // rau thơm/gia vị/dưa chua: bán lẻ (bún tươi có lối ra Bún đậu GĐ1956; hành khô có lối ra Thịt rang cháy cạnh GĐ1984; rau mùi có lối ra Gà xé phay GĐ2064)
]);

describe('GĐ1432 — mọi nguyên liệu tươi có lối ra bếp/quán', () => {
  const cooked = new Set(COOKED_PRODUCTS.map((c) => c.id));
  const used = new Set<string>([
    ...RECIPES.flatMap((r) => r.inputs.map((i) => i.productId)),
    ...QUAN_RECIPES.flatMap((r) => r.uses.map((u) => u.id)),
  ]);
  const fresh = PRODUCTS.filter((p) => !cooked.has(p.id) && ['fresh', 'meat', 'cold', 'frozen'].includes(p.category));

  it('không còn nguyên liệu tươi "chết" ngoài danh sách bán lẻ', () => {
    const orphan = fresh.filter((p) => !used.has(p.id) && !RETAIL_ONLY.has(p.id)).map((p) => p.id);
    expect(orphan).toEqual([]);
  });
  it('danh sách bán lẻ không lỗi thời (mục nào đã có lối ra thì gỡ khỏi danh sách)', () => {
    const ids = new Set(PRODUCTS.map((p) => p.id));
    for (const id of RETAIL_ONLY) {
      expect(ids.has(id)).toBe(true);
      expect(used.has(id)).toBe(false);
    }
  });
});
