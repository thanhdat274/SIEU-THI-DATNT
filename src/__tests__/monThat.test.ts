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
  recipe_rau_muong_luoc: { name: 'Rau muống luộc', station: 'hot_kettle', cachNau: 'luộc nồi nước, chấm nước mắm (cơm nhà miền Bắc)' },
  recipe_bap_luoc: { name: 'Bắp luộc', station: 'hot_kettle', cachNau: 'luộc nguyên trái trong nồi nước (quà vặt cả nước)' },
  recipe_khoai_lang_luoc: { name: 'Khoai lang luộc', station: 'hot_kettle', cachNau: 'luộc nguyên củ trong nồi nước (quà sáng cả nước)' },
  recipe_bong_cai_xao_toi: { name: 'Bông cải xào tỏi', station: 'fryer', cachNau: 'xào lửa lớn với tỏi phi (cơm nhà cả nước)' },
  recipe_bi_do_xao_toi: { name: 'Bí đỏ xào tỏi', station: 'fryer', cachNau: 'bí đỏ thái miếng xào tỏi phi (cơm nhà cả nước)' },
  recipe_canh_bi_do: { name: 'Canh bí đỏ', station: 'hot_kettle', cachNau: 'bí đỏ nấu thịt bằm trong nồi nước (cơm nhà cả nước)' },
  recipe_suon_ram: { name: 'Sườn ram', station: 'fryer', cachNau: 'sườn chiên săn rồi ram nước mắm đường (cơm nhà)' },
  recipe_ga_luoc: { name: 'Gà luộc', station: 'hot_kettle', cachNau: 'luộc nồi nước, chặt chấm muối tiêu chanh (cả nước)' },
  recipe_tom_rim: { name: 'Tôm rim', station: 'fryer', cachNau: 'rim nước mắm đường trong chảo tới săn (cơm nhà)' },
  recipe_muc_xao_hanh_tay: { name: 'Mực xào hành tây', station: 'fryer', cachNau: 'mực xào lửa lớn với hành tây (cả nước)' },
  recipe_thit_rang_chay_canh: { name: 'Thịt rang cháy cạnh', station: 'fryer', cachNau: 'ba chỉ rang cháy cạnh với hành khô (cơm nhà miền Bắc)' },
  recipe_ca_thu_sot_ca: { name: 'Cá thu sốt cà', station: 'fryer', cachNau: 'cá thu chiên vàng rồi rim sốt cà chua (cơm nhà)' },
  recipe_trung_luoc: { name: 'Trứng luộc', station: 'hot_kettle', cachNau: 'trứng gà luộc nồi nước (cơm nhà cả nước)' },
  recipe_rau_cai_luoc: { name: 'Rau cải luộc', station: 'hot_kettle', cachNau: 'luộc nồi nước, chấm nước mắm (cơm nhà cả nước)' },
  recipe_dau_hu_chien: { name: 'Đậu hũ chiên', station: 'fryer', cachNau: 'chiên vàng nhiều dầu, chấm nước mắm (cả nước)' },
  recipe_canh_cai: { name: 'Canh cải', station: 'hot_kettle', cachNau: 'rau cải nấu thịt bằm (cơm nhà cả nước)' },
  recipe_tom_luoc: { name: 'Tôm luộc', station: 'hot_kettle', cachNau: 'luộc nồi nước, chấm muối tiêu chanh (cả nước)' },
  recipe_bo_xao_hanh_tay: { name: 'Bò xào hành tây', station: 'fryer', cachNau: 'bò thái mỏng xào lửa lớn với hành tây (cả nước)' },
  recipe_gia_xao: { name: 'Giá xào', station: 'fryer', cachNau: 'giá đỗ xào nhanh lửa lớn với hành (cơm nhà)' },
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
