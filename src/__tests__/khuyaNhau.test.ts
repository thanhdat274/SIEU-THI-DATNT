import { describe, expect, it } from 'vitest';
import { timeBandAt } from '../data/rhythm';

// GĐ1779 — tối muộn (20h–22h) khách lai rai thèm đồ nhắm: mực khô nướng, cánh gà chiên mắm.
describe('khung tối muộn thèm đồ nhắm (GĐ1779)', () => {
  it.each(['muc_kho_nuong', 'canh_ga_chien_mam'])('21h thèm %s', (id) => {
    expect(timeBandAt(21 * 60)!.wants).toContain(id);
  });
  it('trưa không thèm đồ nhắm', () => {
    expect(timeBandAt(12 * 60)!.wants).not.toContain('muc_kho_nuong');
  });
});
