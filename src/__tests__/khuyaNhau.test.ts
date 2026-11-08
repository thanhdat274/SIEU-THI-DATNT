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

// GĐ1780 — giữa buổi (8h30–11h) có món ăn sáng muộn; cao điểm tối có món kho mang về ăn cơm nhà.
describe('giữa buổi & cao điểm tối (GĐ1780)', () => {
  it.each(['pho_bo', 'banh_cuon_cha_lua'])('9h30 thèm %s', (id) => {
    expect(timeBandAt(9 * 60 + 30)!.wants).toContain(id);
  });
  it.each(['ca_kho_to', 'thit_kho_trung'])('18h thèm %s', (id) => {
    expect(timeBandAt(18 * 60)!.wants).toContain(id);
  });
});

// GĐ1782 — buổi chiều (13h–17h) ăn vặt ngọt: chè khoai môn, bánh flan.
describe('buổi chiều ăn vặt ngọt (GĐ1782)', () => {
  it.each(['che_khoai_mon', 'banh_flan'])('15h thèm %s', (id) => {
    expect(timeBandAt(15 * 60)!.wants).toContain(id);
  });
});
