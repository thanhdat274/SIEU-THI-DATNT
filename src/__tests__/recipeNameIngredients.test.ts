import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';

// GĐ1692 — món ghi tên gia vị thì công thức phải có gia vị đó (chặn lỗi như GĐ1680–1691).
// Chỉ xét công thức mở > 30 (golden sim ≤30 khoá kinh tế).
const RULES: [RegExp, string[]][] = [
  [/(^|\s)sả(\s|$)/i, ['x_sa']],
  [/tỏi/i, ['x_toi', 'x_toi_phi']],
  [/gừng/i, ['x_gung', 'hx_mut_gung', 'mut_tet']],
  [/cốt dừa/i, ['x_dua_cot_hop']],
  [/nước dừa/i, ['x_nuoc_dua_hop', 'x_nuoc_dua_tuoi_chai']],
  [/nước mắm/i, ['nuocmam', 'hx_nuoc_mam']],
  [/xì dầu/i, ['x_nuoc_tuong']],
  [/mật ong/i, ['x_mat_ong', 'mat_ong_rung']],
];

describe('GĐ1692 — tên món khớp nguyên liệu gia vị', () => {
  it('GĐ1702: mỗi luật bắt được tên mẫu', () => {
    const samples = ['Cá basa chiên sả', 'Bánh mì bơ tỏi', 'Mực hấp gừng', 'Chè cốt dừa', 'Tôm hấp nước dừa', 'Cá viên chiên nước mắm', 'Cá hồi hấp xì dầu', 'Cánh gà nướng mật ong'];
    RULES.forEach(([re], i) => expect(re.test(samples[i])).toBe(true));
    expect(RULES[0][0].test('Bánh sảng khoái')).toBe(false); // không khớp chữ chứa 'sả'
  });
  it('mọi công thức mở >30 có tên gia vị đều dùng nguyên liệu đó', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      if (r.unlock <= 30) continue;
      const ids = r.inputs.map((i) => i.productId);
      for (const [re, ok] of RULES) if (re.test(r.name) && !ids.some((id) => ok.includes(id))) bad.push(`${r.id} (${r.name})`);
    }
    expect(bad).toEqual([]);
  });
});
