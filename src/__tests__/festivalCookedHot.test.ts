import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';
import { COOKED_PRODUCT_IDS } from '../data/recipes';

// GĐ1774 — lễ hội có món nấu "hot" đúng không khí: Giáng sinh gà nướng mật ong, giải bóng đá
// cánh gà chiên mắm (đồ nhắm cổ vũ), hội thi làm bánh bánh flan.
describe.each([
  ['giang_sinh', 'ga_nuong_mat_ong'],
  ['bong_da_phuong', 'canh_ga_chien_mam'],
  ['hoi_banh', 'banh_flan'],
  ['cho_dem', 'banh_trang_nuong'],
  ['tet_duong', 'lau_vien_thap_cam'],
  ['khai_giang', 'banh_mi_que'],
  ['valentine', 'kem_dua'],
  ['hoi_xom', 'che_bap'],
  ['nha_giao', 'hop_qua_tra_banh_quy'],
])('lễ %s hot %s (GĐ1774)', (fid, pid) => {
  it('món là món nấu và có trong hot', () => {
    expect(COOKED_PRODUCT_IDS.has(pid)).toBe(true);
    expect(FESTIVALS.find((f) => f.id === fid)!.hot).toContain(pid);
  });
});
