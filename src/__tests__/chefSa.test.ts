import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';

// GĐ1712 — đầu bếp mua sả như gia vị, cạnh tỏi/hành khô.
describe('đầu bếp thích sả (GĐ1712)', () => {
  it('likes của chef có x_sa', () => {
    expect(PROFESSIONS.find((p) => p.id === 'chef')!.likes).toContain('x_sa');
  });
});
