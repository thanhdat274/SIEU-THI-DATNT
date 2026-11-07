import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';

// GĐ1713 — nông dân ăn gà xào sả cho bữa trưa ngoài đồng.
describe('nông dân thích gà xào sả (GĐ1713)', () => {
  it('likes của farmer có ga_xao_sa', () => {
    expect(PROFESSIONS.find((p) => p.id === 'farmer')!.likes).toContain('ga_xao_sa');
  });
});
