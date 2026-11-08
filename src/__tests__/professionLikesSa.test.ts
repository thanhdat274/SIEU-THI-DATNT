import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';
import { productById } from '../data/products';

// GĐ1710–1714 (gộp GĐ1715): chuỗi sả có cầu hằng ngày qua sở thích nghề.
const CASES: [string, string][] = [
  ['construction', 'ga_xao_sa'], ['farmer', 'ga_xao_sa'], ['soldier', 'ga_xao_sa'],
  ['mom', 'x_sa'], ['chef', 'x_sa'], ['athlete', 'bo_xao_sa'], ['traffic_police', 'banh_mi_thit'], ['monk', 'che_hat_sen'],
];

describe('nghề thích món chuỗi sả', () => {
  it.each(CASES)('%s thích %s', (prof, pid) => {
    expect(productById(pid)).toBeTruthy();
    expect(PROFESSIONS.find((p) => p.id === prof)!.likes).toContain(pid);
  });
});
