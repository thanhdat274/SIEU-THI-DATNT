import { describe, expect, it } from 'vitest';
import { VIET_SET, vietSetCount, vietSetDecorBonus } from '../data/decorSets';
import { furnitureDef } from '../data/furniture';

/** GĐ1515 — bộ "Đồ Việt": mốc 2/4/5 loại khác nhau → +5/+12/+20 🩷, không cộng dồn, trùng/hỏng/thử không tính. */
const f = (type: string, extra: object = {}) => ({ type, ...extra }) as never;

describe('decorSets (GĐ1515)', () => {
  it('mọi món trong bộ là decor mở sau golden 30', () => {
    for (const t of VIET_SET) {
      expect(furnitureDef(t).decor ?? 0).toBeGreaterThan(0);
      expect(furnitureDef(t).unlock).toBeGreaterThan(30);
    }
  });
  it('mốc thưởng theo số loại khác nhau', () => {
    expect(vietSetDecorBonus([f('binh_bat_trang')])).toBe(0);
    expect(vietSetDecorBonus([f('binh_bat_trang'), f('binh_bat_trang')])).toBe(0);
    expect(vietSetDecorBonus([f('binh_bat_trang'), f('trong_dong'), f('kho_dao')])).toBe(5);
    expect(vietSetDecorBonus(VIET_SET.slice(0, 4).map((t) => f(t)))).toBe(12);
    expect(vietSetDecorBonus(VIET_SET.map((t) => f(t)))).toBe(20);
  });
  it('đồ hỏng / đồ thử không tính', () => {
    expect(vietSetCount([f('binh_bat_trang'), f('trong_dong', { broken: true }), f('chua_mot_cot', { trial: true })])).toBe(1);
  });
});
