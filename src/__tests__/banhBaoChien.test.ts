import { describe, it, expect } from 'vitest';
import { RECIPES, COOKED_PRODUCTS } from '../data/recipes';
import { PRODUCTS, productById, unlockedProducts } from '../data/products';
import { CONTENT_EPOCH_NOW } from '../data/contentEpoch';

// GĐ2346 — Bánh bao chiên: món mới (hướng chiều sâu người dùng: thêm công thức), mở cấp 71, ghi since
// CONTENT_EPOCH_NOW để golden kỷ nguyên 0 không thấy (SPEC-TOI-UU §T4). Đây là món nội dung mới đầu tiên
// dùng cơ chế epoch mở ở BẤT KỲ cấp nào.
describe('Bánh bao chiên (GĐ2346) — món chiên mới ít chạm golden', () => {
  const r = RECIPES.find((x) => x.id === 'recipe_banh_bao_chien')!;
  const prod = productById('banh_bao_chien')!;

  it('có công thức đúng trạm/nguyên liệu/đầu ra mở cấp 71', () => {
    expect(r).toBeTruthy();
    expect(r.station).toBe('fryer');
    expect(r.inputs.map((i) => i.productId)).toEqual(['botmi', 'x_thit_heo', 'x_hanh_phi']);
    expect(r.outputId).toBe('banh_bao_chien');
    expect(r.unlock).toBe(71);
    expect(r.reputationGain).toBeGreaterThan(0);
  });

  it('thành phẩm vào PRODUCTS, giá bán hợp lý, mở cấp 71', () => {
    expect(prod).toBeTruthy();
    expect(PRODUCTS.includes(prod)).toBe(true);
    expect(prod.sell).toBe(14500);
    expect(prod.unlock).toBe(71);
  });

  it('mẻ lãi hơn bán thẳng nguyên liệu (không phá cân bằng kinh tế)', () => {
    const raw = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId)!.sell, 0);
    expect(r.outputQty * prod.sell).toBeGreaterThan(raw);
  });

  it('món mới ghi since = CONTENT_EPOCH_NOW (golden kỷ nguyên 0 không thấy)', () => {
    expect(r.since).toBe(CONTENT_EPOCH_NOW);
    expect(prod.since).toBe(CONTENT_EPOCH_NOW);
    expect(COOKED_PRODUCTS.some((c) => c.id === 'banh_bao_chien' && c.since === CONTENT_EPOCH_NOW)).toBe(true);
  });

  it('mở trên mọi mốc sim cân bằng không cổng epoch (crisis 45~48 · stance 65~69 · L50 50~52) để không lệch chúng', () => {
    expect(r.unlock).toBeGreaterThanOrEqual(70);
  });

  it('người chơi thật (kỷ nguyên vô cực) thấy món ngay cấp 71', () => {
    expect(unlockedProducts(71).some((p) => p.id === 'banh_bao_chien')).toBe(true);
  });
});
