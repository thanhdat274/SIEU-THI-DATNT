import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';
import { COOKED_PRODUCT_IDS } from '../data/recipes';

// GĐ1774 — lễ hội có món nấu "hot" đúng không khí: Giáng sinh gà nướng mật ong, giải bóng đá
// cánh gà chiên mắm (đồ nhắm cổ vũ), hội thi làm bánh bánh flan.
describe.each([
  ['hoi_xom', 'mit_chien_gion'],
  ['giang_sinh', 'ca_phe_trung'],
  ['le_hoi_lang', 'thit_kho_trung'],
  ['giang_sinh', 'ga_nuong_mat_ong'],
  ['bong_da_phuong', 'canh_ga_chien_mam'],
  ['hoi_banh', 'banh_flan'],
  ['cho_dem', 'banh_trang_nuong'],
  ['tet_duong', 'lau_vien_thap_cam'],
  ['khai_giang', 'banh_mi_que'],
  ['valentine', 'kem_dua'],
  ['hoi_xom', 'che_bap'],
  ['nha_giao', 'hop_qua_tra_banh_quy'],
  ['quoc_te_phu_nu', 'sua_chua_trai_cay'],
  ['hoi_phu_nu', 'sinh_to_dua_hau'],
  ['mua_mua', 'chao_ga'],
  ['bong_da_phuong', 'muc_kho_nuong'],
  ['le_30_4', 'tom_nuong'],
  ['cho_dem', 'bap_ngot_nuong'],
  ['trung_thu', 'banh_pia_nuong'],
])('lễ %s hot %s (GĐ1774)', (fid, pid) => {
  it('món là món nấu và có trong hot', () => {
    expect(COOKED_PRODUCT_IDS.has(pid)).toBe(true);
    expect(FESTIVALS.find((f) => f.id === fid)!.hot).toContain(pid);
  });
});

// GĐ1777 — mọi lễ có ≥1 món nấu hot, trừ Sale cuối năm (dịp xả hàng tạp hóa nhập rẻ).
describe('mọi lễ có món nấu hot (GĐ1777)', () => {
  it('trừ sale_cuoi_nam', () => {
    const none = FESTIVALS.filter((f) => f.id !== 'sale_cuoi_nam' && !(f.hot ?? []).some((i) => COOKED_PRODUCT_IDS.has(i))).map((f) => f.id);
    expect(none).toEqual([]);
  });
});
