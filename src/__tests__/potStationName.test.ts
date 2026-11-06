import { describe, it, expect } from 'vitest';
import { STATIONS, RECIPES } from '../data/recipes';
import { FURNITURE } from '../data/furniture';

/** GĐ1394 — trạm `hot_kettle` nấu phở/cháo/món kho → hiển thị "Bếp nồi nấu", id giữ nguyên cho save cũ. */
describe('GĐ1394 — trạm nồi nấu', () => {
  it('tên/icon hiển thị là nồi, không còn "ấm nước"', () => {
    const st = STATIONS.find((s) => s.id === 'hot_kettle')!;
    const fu = FURNITURE.find((f) => f.type === 'hot_kettle')!;
    expect(st.name).toBe('Bếp nồi nấu');
    expect(st.icon).toBe('🍲');
    expect(fu.name).toBe('Bếp nồi nấu');
    expect(`${st.description} ${fu.desc}`.toLowerCase()).not.toContain('ấm');
  });
  it('id trạm giữ nguyên → công thức cũ & save cũ vẫn trỏ đúng', () => {
    expect(RECIPES.some((r) => r.station === 'hot_kettle' && r.id === 'recipe_chao_long')).toBe(true);
  });
});

/** GĐ1403 — món chiên/áp chảo về Chảo chiên, món hầm về Bếp nồi nấu (rà theo góp ý người dùng). */
describe('GĐ1403 — món đúng trạm', () => {
  const at = (id: string) => RECIPES.find((r) => r.id === id)?.station;
  it('cơm chiên, xôi chiên phồng, cá hồi áp chảo ở chảo chiên', () => {
    for (const id of ['recipe_com_chien', 'recipe_xoi_chien_phong', 'recipe_ca_hoi_ap_chao']) expect(at(id)).toBe('fryer');
  });
  it('bò hầm rượu vang ở bếp nồi nấu', () => {
    expect(at('recipe_bo_ham_vang')).toBe('hot_kettle');
  });
  it('không món "chiên"/"áp chảo" nào ở bếp nướng, không món "hầm" nào ở nồi hấp', () => {
    expect(RECIPES.filter((r) => r.station === 'food_grill' && /chiên|áp chảo/i.test(r.name))).toEqual([]);
    expect(RECIPES.filter((r) => r.station === 'steamer' && /hầm/i.test(r.name))).toEqual([]);
  });
});
