import { describe, expect, it } from 'vitest';
import { REGULARS, unlockedFavorites } from '../data/regulars';

// GĐ1789 — khách quen có món thích "mở sau" (món nấu cấp >30): đầu game không đổi, cuối game
// có lý do mới để chiều khách quen.
describe.each([
  ['ba_nam', 'ca_phe_trung'],
  ['anh_tuan', 'mi_y_sot_bo'],
  ['be_na', 'banh_flan'],
  ['chi_lan', 'sua_chua_trai_cay'],
  ['bac_tam', 'tra_atiso_nau'],
  ['bac_hung_me', 'hut_tieu_nam_vang'],
  ['chu_tu_ho', 'ga_xao_sa'],
  ['thang_barber', 'banh_bao_kim_sa'],
  ['co_mai_bar', 'ca_phe_phin_sua'],
  ['bac_si_hai', 'chao_ga'],
  ['anh_giao_ngan', 'banh_mi_jambon'],
  ['anh_minh_nhau', 'muc_kho_nuong'],
])('%s thích %s (GĐ1789)', (rid, pid) => {
  const def = REGULARS.find((r) => r.id === rid)!;
  it('cấp 30 chưa có, cấp 90 có', () => {
    expect(unlockedFavorites(def, 30)).not.toContain(pid);
    expect(unlockedFavorites(def, 90)).toContain(pid);
  });
  it('món đầu (gợi ý sinh nhật) giữ nguyên món cơ bản', () => {
    expect(def.favorites[0]).not.toBe(pid);
  });
});

// GĐ1795 — trần: tổng món nấu trong favorites khách quen ≤ 12. GĐ1794 thêm tới 15 làm
// economySimL50 tụt dưới ngưỡng (21/22) — muốn thêm phải kiểm lại sim cấp 50.
import { COOKED_PRODUCT_IDS } from '../data/recipes';
describe('trần món nấu trong favorites khách quen (GĐ1795)', () => {
  it('≤ 12', () => {
    const n = REGULARS.reduce((s, r) => s + r.favorites.filter((i) => COOKED_PRODUCT_IDS.has(i)).length, 0);
    expect(n).toBeLessThanOrEqual(12);
  });
});
