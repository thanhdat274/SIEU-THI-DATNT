import { describe, expect, it } from 'vitest';
import { TIME_BANDS } from '../data/rhythm';

// GĐ1798 — giữa buổi sáng khách muốn bún bò Huế (món nấu cấp 36)
describe('giữa buổi muốn bún bò Huế', () => {
  it('giua_sang có bun_bo_hue', () => {
    expect(TIME_BANDS.find((b) => b.id === 'giua_sang')!.wants).toContain('bun_bo_hue');
  });
});

// GĐ1799 — tối muốn canh chua cá
describe('tối canh chua', () => {
  it.each([['toi', 'canh_chua_ca']])('%s có %s', (band, id) => {
    expect(TIME_BANDS.find((b) => b.id === band)!.wants).toContain(id);
  });
});
