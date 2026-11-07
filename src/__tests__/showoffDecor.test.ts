import { describe, expect, it } from 'vitest';
import { furnitureDef } from '../data/furniture';
import { decorScoreOf } from '../data/layout';
import type { Furniture } from '../core/store';

/** GĐ1510 — trang trí "khoe" tầng 2–3: đắt, mở muộn, điểm/đồng thấp hẳn đồ rẻ (đồ rẻ mới là hiệu quả). */
const SHOWOFF = ['binh_bat_trang', 'trong_dong', 'chua_mot_cot'] as const;
const CHEAP = ['kho_dao', 'ke_gia_vi', 'ke_chen', 'thung_rac', 'tham_chan', 'den_long', 'tranh_dong_ho', 'bon_rua'] as const;
const perMillion = (id: string) => ((furnitureDef(id as never).decor ?? 0) / furnitureDef(id as never).price) * 1e6;

describe('showoffDecor (GĐ1510)', () => {
  it('3 món có điểm 🩷, giá tăng dần, mở sau golden 30 (sim kinh tế không đổi)', () => {
    let prev = 0;
    for (const id of SHOWOFF) {
      const d = furnitureDef(id);
      expect(d.decor ?? 0).toBeGreaterThan(0);
      expect(d.unlock).toBeGreaterThan(30);
      expect(d.price).toBeGreaterThan(prev);
      expect(d.tiers).toBe(0);
      prev = d.price;
    }
  });

  it('điểm/đồng: món khoe đắt hơn thì kém hiệu quả hơn; mọi món khoe kém hơn món bếp kém nhất', () => {
    const cheapWorst = Math.min(...CHEAP.map(perMillion));
    const rates = SHOWOFF.map(perMillion);
    expect(rates[0]).toBeGreaterThan(rates[1]);
    expect(rates[1]).toBeGreaterThan(rates[2]);
    expect(Math.max(...rates)).toBeLessThan(cheapWorst);
  });

  it('decorScoreOf cộng điểm món khoe như mọi decor', () => {
    const f = SHOWOFF.map((type, i) => ({ uid: i + 1, type, x: 0, z: 0, rot: 0, tiers: [] } as unknown as Furniture));
    expect(decorScoreOf(f)).toBe(12 + 18 + 30);
  });
});
