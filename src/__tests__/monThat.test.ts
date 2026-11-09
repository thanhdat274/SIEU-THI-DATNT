import { describe, expect, it } from 'vitest';
import { productById } from '../data/products';
import { RECIPES } from '../data/recipes';

/**
 * Sổ "món có thật": tên chuẩn ngoài đời + trạm theo cách nấu thật (xem CLAUDE.md).
 * Thêm món mới → thêm 1 dòng ở đây.
 */
const MON_THAT: Record<string, { name: string; station: string; cachNau: string }> = {
  recipe_banh_khot: { name: 'Bánh khọt', station: 'fryer', cachNau: 'chiên khuôn nhiều dầu (Vũng Tàu)' },
  recipe_banh_can: { name: 'Bánh căn', station: 'food_grill', cachNau: 'khuôn đất nung đậy nắp trên than (Phan Rang/Nha Trang)' },
  recipe_banh_beo: { name: 'Bánh bèo chén', station: 'steamer', cachNau: 'hấp chén, tôm chấy + mỡ hành (Huế)' },
  recipe_bot_chien_trung: { name: 'Bột chiên', station: 'fryer', cachNau: 'bột gạo hấp cắt miếng chiên với trứng (Sài Gòn)' },
  recipe_banh_chuoi_hap: { name: 'Bánh chuối hấp', station: 'steamer', cachNau: 'chuối + bột năng hấp, nước cốt dừa (Nam Bộ)' },
  recipe_banh_bo: { name: 'Bánh bò', station: 'steamer', cachNau: 'bột gạo ủ hấp nở rỗ (Nam Bộ)' },
  recipe_bun_dau_mam_tom: { name: 'Bún đậu mắm tôm', station: 'fryer', cachNau: 'đậu hũ chiên vàng + bún lá, chấm mắm tôm (Hà Nội)' },
  recipe_dau_hu_sot_ca_chua: { name: 'Đậu hũ sốt cà chua', station: 'fryer', cachNau: 'đậu hũ chiên vàng rồi rim sốt cà chua (cơm nhà cả nước)' },
  recipe_rau_muong_xao_toi: { name: 'Rau muống xào tỏi', station: 'fryer', cachNau: 'xào lửa lớn với tỏi phi (cơm nhà cả nước)' },
  recipe_kho_qua_xao_trung: { name: 'Khổ qua xào trứng', station: 'fryer', cachNau: 'khổ qua xào chín rồi đảo trứng (cơm nhà cả nước)' },
  recipe_dau_hu_nhoi_thit: { name: 'Đậu hũ nhồi thịt', station: 'fryer', cachNau: 'đậu hũ nhồi thịt xay chiên vàng, rim sốt (cơm nhà)' },
  recipe_thit_luoc: { name: 'Thịt luộc', station: 'hot_kettle', cachNau: 'thịt heo luộc nồi nước, thái lát chấm mắm (cơm nhà)' },
  recipe_bap_cai_luoc: { name: 'Bắp cải luộc', station: 'hot_kettle', cachNau: 'luộc nồi nước, chấm trứng/nước mắm (cơm nhà)' },
  recipe_ca_tim_nuong_mo_hanh: { name: 'Cà tím nướng mỡ hành', station: 'food_grill', cachNau: 'nướng than cháy vỏ, xé rưới mỡ hành (Nam Bộ)' },
};

/** Chữ mô tả tự chế không ai dùng làm tên món ngoài chợ. */
const CHU_TU_CHE = [/đổ khuôn/i, /chén hấp/i, /hấp chén/i, /kiểu mới/i, /đặc biệt nhà làm/i];

describe('Món có thật — tên & trạm đúng ngoài đời', () => {
  for (const [id, mon] of Object.entries(MON_THAT)) {
    it(`${mon.name}: ${mon.cachNau}`, () => {
      const r = RECIPES.find((x) => x.id === id);
      expect(r, `thiếu công thức ${id}`).toBeTruthy();
      expect(r!.name).toBe(mon.name);
      expect(r!.station).toBe(mon.station);
      expect(productById(r!.outputId).name).toBe(mon.name);
    });
  }

  it('không công thức nào mang chữ mô tả tự chế trong tên', () => {
    for (const r of RECIPES) for (const re of CHU_TU_CHE) expect(r.name, r.id).not.toMatch(re);
  });
});
