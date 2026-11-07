import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES } from '../data/quanRecipes';

// GĐ1701 — món quán nước ghi tên nguyên liệu thì phải dùng nguyên liệu đó (như GĐ1692 cho bếp).
const RULES: [RegExp, RegExp][] = [
  [/gừng/i, /gung/], [/dừa/i, /dua/], [/chanh/i, /chanh/], [/\bcam\b/i, /cam/],
  [/sữa/i, /sua/], [/tắc/i, /tac|quat/], [/mật ong/i, /mat_ong/], [/bạc hà/i, /bac_ha/],
];

describe('GĐ1701 — tên món quán nước khớp nguyên liệu', () => {
  it('GĐ1702: mỗi luật thật sự bắt được tên mẫu (regex không câm với chữ Việt)', () => {
    const samples = ['Trà gừng', 'Nước dừa', 'Trà chanh', 'Cam gừng đá', 'Trà sữa', 'Trà tắc', 'Trà mật ong', 'Soda bạc hà'];
    RULES.forEach(([name], i) => expect(name.test(samples[i])).toBe(true));
    expect(RULES[3][0].test('Cà phê cốt dừa')).toBe(false); // "cam" không khớp nhầm
  });
  it('mọi món có tên nguyên liệu đều dùng nguyên liệu đó', () => {
    const bad: string[] = [];
    for (const q of QUAN_RECIPES) {
      const ids = q.uses.map((u) => u.id).join(',');
      for (const [name, id] of RULES) if (name.test(q.name) && !id.test(ids)) bad.push(`${q.id} (${q.name})`);
    }
    expect(bad).toEqual([]);
  });
});
