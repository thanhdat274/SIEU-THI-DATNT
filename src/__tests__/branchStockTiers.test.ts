// GĐ1008 — bảo vệ logic bày hàng 3D ở chi nhánh 24/7 (`branchStockTiers`, trước đây 0% coverage).
// Hàm thuần (chỉ dùng furnitureDef + productById + layout) nên test không cần THREE/đi bộ.
import { describe, it, expect } from 'vitest';
import { branchStockTiers } from '../agents/branchVisit';
import { furnitureDef } from '../data/furniture';
import { productById } from '../data/products';
import { BRANCH_LAYOUT } from '../data/branches';

const slots = (type: string) => {
  const d = furnitureDef(type as never);
  return d.tiers * d.slots;
};
const capacity = (type: string) => furnitureDef(type as never).capacity;

describe('branchStockTiers — bày hàng 3D chi nhánh 24/7', () => {
  it('phân loại đúng chỗ: drink/cold → tủ mát, frozen → tủ đông, còn lại → kệ', () => {
    const layout = [{ type: 'fridge' }, { type: 'freezer' }, { type: 'shelf' }] as never;
    const out = branchStockTiers(
      { mi: 6, nuoc: 8, suachua: 4, kem: 5, banh: 3 },
      layout,
    );
    expect(out).toHaveLength(3);
    // Tủ mát: chỉ drink (nuoc) + cold (suachua), sắp theo số lượng giảm dần → nuoc(8) rồi suachua(4)
    const fridgeCats = out[0].map((t) => productById(t.productId!).category);
    expect(fridgeCats.every((c) => c === 'drink' || c === 'cold')).toBe(true);
    expect(out[0][0].productId).toBe('nuoc');
    expect(out[0][1].productId).toBe('suachua');
    // Tủ đông: chỉ frozen → kem
    expect(out[1].every((t) => productById(t.productId!).category === 'frozen')).toBe(true);
    // Kệ: phần còn lại (không drink/cold/frozen) → mi, banh
    expect(out[2].every((t) => { const c = productById(t.productId!).category; return c !== 'drink' && c !== 'cold' && c !== 'frozen'; })).toBe(true);
  });

  it('mỗi kệ/tủ đủ đúng số ngăn = tiers×slots; tủ không có chỗ trả []', () => {
    const layout = [{ type: 'shelf' }, { type: 'wall' }] as never;
    const out = branchStockTiers({ mi: 6 }, layout);
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveLength(slots('shelf')); // shelf có tiers×slots ô
    expect(out[1]).toEqual([]);                  // wall tiers×slots = 0 → không đụng view
  });

  it('count = min(capacity, ceil(q/2)); bị chặn bởi sức chứa tối đa', () => {
    const layout = [{ type: 'shelf' }] as never;
    const cap = capacity('shelf');
    // q=100 → ceil(100/2)=50 > cap → count bị chặn về cap (mỗi ô chỉ bày tối đa capacity món)
    expect(branchStockTiers({ mi: 100 }, layout)[0].every((t) => t.count === cap)).toBe(true);
    // q=2 → ceil(2/2)=1 món mỗi ô
    expect(branchStockTiers({ mi: 2 }, layout)[0].every((t) => t.count === 1)).toBe(true);
    // q=7 → ceil(7/2)=4 món (nhỏ hơn cap) — không bị chặn
    expect(branchStockTiers({ mi: 7 }, layout)[0][0].count).toBe(4);
  });

  it('tủ mát/kệ không có hàng đúng loại thì bày tạm hàng khác cho khỏi trống', () => {
    const layout = [{ type: 'fridge' }] as never;
    // Chỉ có đồ khô (mi): tủ mát không có drink/cold → lấy tạm toàn bộ hàng (mi) để khỏi trống
    const fridge = branchStockTiers({ mi: 6 }, layout)[0];
    expect(fridge.every((t) => t.productId === 'mi')).toBe(true);
  });

  it('tủ đông KHÔNG bày tạm hàng khác (chỉ đông lạnh); hết hàng thì để trống — thay vì lộn loại', () => {
    const layout = [{ type: 'freezer' }] as never;
    // Chỉ có đồ khô: tủ đông đúng ra phải trống — fallback đặc biệt chỉ áp dụng cho kệ/tủ mát
    expect(branchStockTiers({ mi: 6 }, layout)[0].every((t) => t.productId === null && t.count === 0)).toBe(true);
  });

  it('lọc bỏ món có số lượng = 0 hoặc âm', () => {
    const layout = [{ type: 'shelf' }] as never;
    const out = branchStockTiers({ mi: 0, banh: -3, nuoc: 4 }, layout)[0];
    expect(out.every((t) => t.productId !== 'mi' && t.productId !== 'banh')).toBe(true);
    expect(out.every((t) => t.productId === 'nuoc')).toBe(true);
  });

  it('phân phối đều qua từng ô: xoay vòng theo món (nhiều hơn số ô thì lặp lại, chia đều số lượng)', () => {
    const layout = [{ type: 'shelf' }] as never;
    const s = slots('shelf');
    // 2 món khô, ít hơn số ô → không lặp; đủ để xoay vòng [banh, mi, banh, mi, ...]
    const out = branchStockTiers({ mi: 2, banh: 4 }, layout)[0];
    expect(out).toHaveLength(s);
    const seq = out.map((t) => t.productId);
    expect(seq[0]).toBe('banh'); // sắp theo q giảm: banh(4) trước mi(2)
    expect(seq[1]).toBe('mi');
    expect(seq[2]).toBe('banh'); // hết vòng thì lặp lại món đầu
  });

  it('chạy với layout CHI NHÁNH THẬT: kệ/tủ có chỗ đều ra đủ tiers×slots ngăn', () => {
    const out = branchStockTiers({ mi: 10, nuoc: 8, suachua: 5, kem: 6 }, BRANCH_LAYOUT);
    expect(out).toHaveLength(BRANCH_LAYOUT.length);
    BRANCH_LAYOUT.forEach((f, i) => {
      const d = furnitureDef(f.type);
      const expectLen = d.tiers * d.slots;
      expect(out[i], `fixture ${i} (${f.type})`).toHaveLength(expectLen);
    });
  });
});
