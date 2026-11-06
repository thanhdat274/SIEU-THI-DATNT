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
