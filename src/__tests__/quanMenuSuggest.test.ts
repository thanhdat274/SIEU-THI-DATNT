import { describe, it, expect } from 'vitest';
import { quanBestAdd, quanBestAddLine } from '../data/quanMenuSuggest';
import { quanRecipesAt, recipeCupCost, QUAN_MENU_SLOTS } from '../data/quanRecipes';

/**
 * GĐ1306 — "tối nay quán nước nên thêm MÓN NÀO?": xếp hạng công thức CHƯA BÁN theo lãi/ly
 * (price × priceMul − recipeCupCost) + cờ mở ×khách đồ nóng (quanHotMul trời mưa/bão ×1.2 / tháng rét
 * ×1.1) + điều kiện kho recipeCapacity. Helper THUẦN ĐỌC — chỉ nhân số ghi sẵn (Nguyên tắc c), không
 * import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
describe('GĐ1306 — quanBestAdd (tối nay quán nước nên thêm món nào)', () => {
  it('thực đơn đã ĐẦY ô (slots) → null (không ồn, để người chơi tự hoán đổi)', () => {
    const s = quanBestAdd({ level: 29, storage: {}, menu: ['tra_da', 'ca_phe_den', 'nuoc_chanh', 'nuoc_mia'], priceMul: 1 });
    expect(s).toBeNull();
  });

  it('không còn món chưa bán (slots đủ lớn, cả lô đã nằm menu) → null', () => {
    const full = quanRecipesAt(29).map((r) => r.id);
    const s = quanBestAdd({ level: 29, storage: {}, menu: full, priceMul: 1, slots: full.length });
    expect(s).toBeNull();
  });

  it('trời NẮNG: chọn món ĐỦ nguyên liệu có lãi/ly CAO NHẤT (không ưu tiên nóng)', () => {
    const recs = quanRecipesAt(29);
    const storage = Object.fromEntries(recs.flatMap((r) => r.uses.map((u) => [u.id as string, 1])));
    const s = quanBestAdd({ level: 29, storage, menu: [], priceMul: 1, weather: 'sunny' })!;
    const expBest = [...recs]
      .map((r) => ({ id: r.id, m: Math.round(r.price * 1 - recipeCupCost(r)) }))
      .sort((a, b) => b.m - a.m)[0];
    expect(s).not.toBeNull();
    expect(s.better.id).toBe(expBest.id);
    expect(s.marginPerCup).toBe(expBest.m);
    expect(s.hotUnlocks).toBe(false);
    expect(s.locked).toBe(false);
    expect(s.capacity).toBeGreaterThan(0);
  });

  it('trời MƯA + thực đơn chưa có món nóng → ưu tiên món NÓNG đủ nguyên liệu (mở ×khách ×1.2)', () => {
    const recs = quanRecipesAt(40);
    const storage = Object.fromEntries(recs.flatMap((r) => r.uses.map((u) => [u.id as string, 1])));
    const s = quanBestAdd({ level: 40, storage, menu: [], priceMul: 1, weather: 'rain', day: 200 })!;
    expect(s).not.toBeNull();
    expect(s.hotUnlocks).toBe(true);
    expect(s.better.hot).toBe(true);
  });

  it('trời mưa NHƯNG thực đơn ĐÃ có món nóng → không ưu tiên nóng nữa (hotUnlocks false)', () => {
    const recs = quanRecipesAt(40);
    const storage = Object.fromEntries(recs.flatMap((r) => r.uses.map((u) => [u.id as string, 1])));
    const s = quanBestAdd({ level: 40, storage, menu: ['ca_phe_sua_nong'], priceMul: 1, weather: 'rain', day: 200 })!;
    expect(s).not.toBeNull();
    expect(s.hotUnlocks).toBe(false);
  });

  it('món lãi/ly cao thiếu nguyên liệu → chọn món ĐỦ nguyên liệu khác (locked=false), không bịa', () => {
    // storage chỉ đủ cho nuoc_chanh (x_chanh_khong_hat + x_duong + x_nuoc_da); các món khác thiếu thứ gì đó
    const storage = { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 };
    const s = quanBestAdd({ level: 29, storage, menu: [], priceMul: 1, weather: 'sunny' })!;
    expect(s.better.id).toBe('nuoc_chanh');
    expect(s.locked).toBe(false);
    expect(s.capacity).toBeGreaterThan(0);
  });

  it('TẤT CẢ món đều thiếu nguyên liệu → vẫn đề xuất món lãi/ly cao, locked=true + line nhắc nhập', () => {
    const s = quanBestAdd({ level: 29, storage: {}, menu: [], priceMul: 1, weather: 'sunny' })!;
    expect(s).not.toBeNull();
    expect(s.locked).toBe(true);
    expect(s.capacity).toBe(0);
    const line = quanBestAddLine(s, 'sunny');
    expect(line).toContain('/ly');
    expect(line).toContain('thiếu nguyên liệu');
  });

  it('line: rỗng khi null (không ồn)', () => {
    expect(quanBestAddLine(null)).toBe('');
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    const arg = { level: 29, storage: { x_chanh_khong_hat: 1, mia: 2 }, menu: ['tra_da'], priceMul: 1 };
    expect(quanBestAdd(arg)).toEqual(quanBestAdd(arg));
  });

  it('QUAN_MENU_SLOTS là hằng 4 (khớp giao diện)', () => {
    expect(QUAN_MENU_SLOTS).toBe(4);
  });
});
