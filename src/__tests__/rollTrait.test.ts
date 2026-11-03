import { describe, expect, it } from 'vitest';
import { rollTrait, TRAITS } from '../data/staffTraits';

/**
 * Bộ test GĐ1038 — `data/staffTraits.rollTrait` nhánh RƠI CUỐI (dòng 76–77 TRƯỚC ĐÂY 0%:
 * `return 'steady'` khi roll không hết tổng trọng số — rng cao quá 1 thì luôn rơi vào đây) + phân
 * bổ theo tỉ trọng TRAITS (steady 4, diligent 2, friendly 2, lazy 1.5, sticky 1 → tổng 10.5).
 *
 * Hợp đồng: rng()*tổng trọng trừ lần lượt theo thứ tự key; <0 thì trả tính đó; hết mà vẫn dư → 'steady'.
 */

const T = Object.keys(TRAITS) as (keyof typeof TRAITS)[];
const total = T.reduce((n, id) => n + TRAITS[id].weight, 0); // 10.5

describe('rollTrait — bốc tính theo tỉ trọng', () => {
  it('rng cao quá tổng → rơi về mặc định steady (fallback 76)', () => {
    expect(rollTrait(() => 1.2)).toBe('steady'); // 1.2×10.5=12.6 > tổng 10.5
  });

  it('rng thấp → steady (trọng đầu)', () => {
    expect(rollTrait(() => 0.1)).toBe('steady'); // 1.05 < 4
  });

  it('rng vừa → diligent (khớp dải trọng số)', () => {
    expect(rollTrait(() => 0.45)).toBe('diligent'); // 4.725: 4.725−4=0.725, −2=<0
  });

  it('rng cao dần → lazy (trọng thứ 4)', () => {
    expect(rollTrait(() => 0.82)).toBe('lazy'); // 8.61: −4−2−2=0.61, −1.5=<0
  });

  it('tính trả về luôn là một key hợp lệ', () => {
    const t = rollTrait(() => 0.5);
    expect(T.includes(t as never)).toBe(true);
  });
});
