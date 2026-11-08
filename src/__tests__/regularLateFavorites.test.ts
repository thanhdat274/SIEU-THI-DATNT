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
])('%s thích %s (GĐ1789)', (rid, pid) => {
  const def = REGULARS.find((r) => r.id === rid)!;
  it('cấp 30 chưa có, cấp 60 có', () => {
    expect(unlockedFavorites(def, 30)).not.toContain(pid);
    expect(unlockedFavorites(def, 60)).toContain(pid);
  });
  it('món đầu (gợi ý sinh nhật) giữ nguyên món cơ bản', () => {
    expect(def.favorites[0]).not.toBe(pid);
  });
});
