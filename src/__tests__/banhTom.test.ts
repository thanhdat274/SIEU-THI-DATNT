import { describe, it, expect } from 'vitest';
import { RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { PRODUCTS, productById, unlockedProducts } from '../data/products';
import { CONTENT_EPOCH_NOW } from '../data/contentEpoch';

// GĐ2350 — Bánh tôm: món mới theo hướng chiều sâu người dùng (thêm sản phẩm/công thức), chảo chiên,
// nối TÔM SÚ (hàng meat đắt, mở 42) thành món ăn vặt bên cạnh các món quán nhậu. Mở cấp 74, ghi since
// CONTENT_EPOCH_NOW → golden kỷ nguyên 0 không thấy (SPEC-TOI-UU §T4, cùng luật bánh bao chiên GĐ2346).
describe('Bánh tôm (GĐ2350) — món chiên mới ít chạm golden', () => {
  const r = RECIPES.find((x) => x.id === 'recipe_banh_tom')!;
  const prod = productById('banh_tom')!;

  it('có công thức đúng trạm/nguyên liệu/đầu ra mở cấp 74', () => {
    expect(r).toBeTruthy();
    expect(r.station).toBe('fryer'); // chiên ngập dầu — trạm chảo chiên
    expect(r.inputs.map((i) => i.productId)).toEqual(['tom_su_tuoi', 'botmi', 'x_hanh_phi']);
    expect(r.outputId).toBe('banh_tom');
    expect(r.unlock).toBe(74);
    expect(r.reputationGain).toBeGreaterThan(0);
  });

  it('thành phẩm vào PRODUCTS, giá bán hợp lý, mở cấp 74', () => {
    expect(prod).toBeTruthy();
    expect(PRODUCTS.includes(prod)).toBe(true);
    expect(prod.sell).toBe(19000);
    expect(prod.unlock).toBe(74);
  });

  it('mẻ lãi hơn bán thẳng nguyên liệu (không phá cân bằng kinh tế)', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId)!.sell, 0);
    expect(r.outputQty * prod.sell).toBeGreaterThan(raw);
  });

  it('món mới ghi since = CONTENT_EPOCH_NOW (golden kỷ nguyên 0 không thấy)', () => {
    expect(r.since).toBe(CONTENT_EPOCH_NOW);
    expect(prod.since).toBe(CONTENT_EPOCH_NOW);
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_tom' && c.since === CONTENT_EPOCH_NOW)).toBe(true);
  });

  it('mở trên mọi mốc sim cân bằng không cổng epoch (crisis 45~48 · stance 65~69 · L50 50~52), tránh mốc latePremium 82/86/91/96/100', () => {
    expect(r.unlock).toBeGreaterThanOrEqual(70);
    expect(r.unlock).toBeLessThan(82);
  });

  it('người chơi thật (kỷ nguyên vô cực) thấy món ngay cấp 74', () => {
    expect(unlockedProducts(74).some((p) => p.id === 'banh_tom')).toBe(true);
  });
});
