import { describe, expect, it } from 'vitest';
import { mealFactor } from '../data/branches';

// GĐ1783 — tiện lợi 24/7 xoay ca: sáng thêm phở bò, bánh cuốn chả lụa; trưa thêm cơm chiên
// lạp xưởng, cơm cá cơm rim.
describe('thực đơn ca tiện lợi (GĐ1783)', () => {
  it.each(['pho_bo', 'banh_cuon_cha_lua'])('%s hút khách 7h, không trưa', (id) => {
    expect(mealFactor(id, 7 * 60)).toBe(2.2);
    expect(mealFactor(id, 12 * 60)).toBe(1);
  });
  it.each(['com_chien_lap_xuong', 'com_ca_com_rim'])('%s hút khách 12h, không sáng', (id) => {
    expect(mealFactor(id, 12 * 60)).toBe(2.2);
    expect(mealFactor(id, 7 * 60)).toBe(1);
  });
});
