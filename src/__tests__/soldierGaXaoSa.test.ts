import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';

// GĐ1714 — bộ đội về phép ghé ăn gà xào sả.
describe('bộ đội thích gà xào sả (GĐ1714)', () => {
  it('likes của soldier có ga_xao_sa', () => {
    expect(PROFESSIONS.find((p) => p.id === 'soldier')!.likes).toContain('ga_xao_sa');
  });
});
