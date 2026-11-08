import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';
import { productById } from '../data/products';

// GĐ1710–1714 (gộp GĐ1715): chuỗi sả có cầu hằng ngày qua sở thích nghề.
const CASES: [string, string][] = [
  ['construction', 'ga_xao_sa'], ['farmer', 'ga_xao_sa'], ['soldier', 'ga_xao_sa'],
  ['mom', 'x_sa'], ['chef', 'x_sa'], ['athlete', 'bo_xao_sa'], ['traffic_police', 'banh_mi_thit'], ['monk', 'che_hat_sen'], ['tailor', 'banh_mi_pate'], ['street_hairstylist', 'banh_trang_nuong'], ['reporter', 'ca_phe_trung'], ['fisherman', 'ca_kho_to'], ['teacher', 'pho_bo'], ['freelancer', 'mi_y_sot_bo'], ['barista', 'ca_phe_phin_sua'], ['influencer', 'banh_flan'], ['online_seller', 'com_chien_lap_xuong'], ['pho_vendor', 'bun_bo_hue'], ['mechanic', 'hut_tieu_nam_vang'], ['electrician', 'banh_mi_que'], ['barber', 'banh_bao_kim_sa'], ['police', 'com_suon_nuong'],
];

describe('nghề thích món chuỗi sả', () => {
  it.each(CASES)('%s thích %s', (prof, pid) => {
    expect(productById(pid)).toBeTruthy();
    expect(PROFESSIONS.find((p) => p.id === prof)!.likes).toContain(pid);
  });
});
