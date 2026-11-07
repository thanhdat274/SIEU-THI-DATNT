/**
 * Công thức pha chế quán nước (GĐ415): quán không chỉ bán lại nước đóng chai mà PHA từ nguyên liệu
 * trong kho chung (trà, cà phê, sữa đặc, đá, trái cây…). Người chơi chọn tối đa QUAN_MENU_SLOTS món lên
 * thực đơn; thực đơn càng đa dạng khách càng đông. Món pha lời hơn nước chai nhiều nhưng phải nhập đủ
 * từng nguyên liệu — thiếu một thứ là món đó ngừng bán. Hoàn toàn xác định (không Math.random).
 */
import { productById } from './products';
import { monthOf } from './calendar';

export interface QuanRecipe {
  id: string;
  name: string;
  icon: string;
  /** Cấp mở công thức (quán nước mở ở cấp 29). */
  unlock: number;
  /** Giá một ly ở mức giá "vừa phải". */
  price: number;
  /** Mỗi nguyên liệu: một đơn vị trong kho pha được bao nhiêu ly. */
  uses: { id: string; cups: number }[];
  /** GĐ476: đồ nóng — giữ khách ngày mưa. */
  hot?: boolean;
}

export const QUAN_RECIPES: QuanRecipe[] = [
  { id: 'tra_da', name: 'Trà đá', icon: '🧊', unlock: 29, price: 5_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_den', name: 'Cà phê đen đá', icon: '☕', unlock: 29, price: 15_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'nuoc_chanh', name: 'Nước chanh', icon: '🍋', unlock: 29, price: 12_000, uses: [{ id: 'x_chanh_khong_hat', cups: 8 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'nuoc_mia', name: 'Nước mía', icon: '🎋', unlock: 29, price: 12_000, uses: [{ id: 'mia', cups: 4 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_sua', name: 'Cà phê sữa đá', icon: '🥛', unlock: 30, price: 20_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'cam_vat', name: 'Cam vắt', icon: '🍊', unlock: 31, price: 22_000, uses: [{ id: 'x_cam', cups: 3 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'chanh_day', name: 'Chanh dây đá', icon: '💛', unlock: 32, price: 18_000, uses: [{ id: 'x_chanh_day', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1090: Trà vải — món quán nước của vải thiều nông trại (x_vai mở cấp 32 nhưng chưa có lối ra pha),
  // khép chuỗi trồng → pha → bán như GĐ1088. Mở 34 ≥ cấp vải 32 → tự cung được trước khi mở món.
  { id: 'tra_vai', name: 'Trà vải', icon: '🍒', unlock: 34, price: 20_000, uses: [{ id: 'x_vai', cups: 4 }, { id: 'tra', cups: 40 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1445: lối ra quán nước cho chanh muối hàng xóm
  { id: 'chanh_muoi_da', name: 'Nước chanh muối', icon: '🍋', unlock: 40, price: 18_000, uses: [{ id: 'hx_chanh_muoi', cups: 12 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1446: Đá me — lối ra quán nước cho me dầm bà Tám
  { id: 'da_me', name: 'Đá me', icon: '🟤', unlock: 42, price: 17_000, uses: [{ id: 'hx_me_dam', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1329: Trà nhãn — món quán nước của nhãn nông trại (x_nhan mở cấp 30 nhưng chưa có lối ra pha), pha đá
  // ngọt dịu, khép chuỗi trồng → pha → bán như trà vải GĐ1090. Giá vốn/ly = 24k/4 + 20k/40 + 17k/30 + 3k/10
  // = 7.4k → bán 22k (lời >2× vốn). Mở 31 > mốc golden 30 → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'tra_nhan', name: 'Trà nhãn', icon: '🍈', unlock: 31, price: 22_000, uses: [{ id: 'x_nhan', cups: 4 }, { id: 'tra', cups: 40 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'bac_xiu', name: 'Bạc xỉu', icon: '🤎', unlock: 33, price: 25_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 25 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_cao_sua', name: 'Ca cao sữa', icon: '🍫', unlock: 34, price: 22_000, uses: [{ id: 'x_bot_cacao', cups: 10 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'sinh_to', name: 'Sinh tố trái cây', icon: '🍓', unlock: 35, price: 28_000, uses: [{ id: 'traicay', cups: 3 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'tra_sua_dua', name: 'Trà sữa cốt dừa', icon: '🥥', unlock: 38, price: 25_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_dua_cot_hop', cups: 8 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'sinh_to_xoai', name: 'Sinh tố xoài', icon: '🥭', unlock: 39, price: 30_000, uses: [{ id: 'x_xoai', cups: 3 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1325: Sinh tố vải sấy — quán nước hồi mềm vải thiều sấy nhà hàng xóm xay đá (khép chuỗi hàng xóm → quán nước,
  // nối nguồn cung GĐ1321 đã dùng cho chè vải ở bếp thêm 1 lối ra quầy pha). Giá vốn/ly = 42k/4 + 22k/10 + 3k/10
  // = 13k → lời hơn nước chai nhiều. Mở 40 > mốc golden 30 → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sinh_to_vai', name: 'Sinh tố vải sấy', icon: '🍒', unlock: 40, price: 27_000, uses: [{ id: 'hx_vai_say', cups: 4 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1092: Sinh tố ổi & sinh tố chuối — hai món cuối của trái cây nông trại còn "ngủ đông"
  // (x_oi, x_chuoi mở cấp 22 nhưng chưa có lối ra pha). Mở 34/35 > mốc golden 30 → sim không đổi.
  { id: 'sinh_to_oi', name: 'Sinh tố ổi', icon: '🍏', unlock: 34, price: 24_000, uses: [{ id: 'x_oi', cups: 4 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'sinh_to_chuoi', name: 'Sinh tố chuối', icon: '🍌', unlock: 35, price: 24_000, uses: [{ id: 'x_chuoi', cups: 4 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1330: Sinh tố mít — món quán nước của mít nông trại (x_mit mở cấp 26 nhưng chưa có lối ra pha), xay sữa đặc,
  // khép chuỗi trồng → pha → bán như trà vải GĐ1090/sinh tố ổi-chuối GĐ1092. Giá vốn/ly = 16k/4 + 22k/10 + 3k/10
  // = 6.5k → bán 26k (lời >2× vốn). Mở 34 > mốc golden 30 → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sinh_to_mit', name: 'Sinh tố mít', icon: '🍈', unlock: 34, price: 26_000, uses: [{ id: 'x_mit', cups: 4 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1334: Bưởi đá — món quán nước của bưởi nông trại (x_buoi mở cấp 24, hiện chỉ có chè bưởi ở BẾP — chưa có lối ra
  // pha), đá ngọt mát, khép chuỗi trồng → pha → bán. Giá vốn/ly = 16k/4 + 17k/30 + 3k/10 = 4.9k → bán 20k (lời >2× vốn).
  // Mở 32 > mốc golden 30 → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'buoi_da', name: 'Bưởi đá', icon: '🍈', unlock: 32, price: 20_000, uses: [{ id: 'x_buoi', cups: 4 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1347: Cà phê cốt dừa — thức uống trend Việt Nam (đậm cà phê, béo cốt dừa hộp), khép chuỗi cà phê × cốt dừa:
  // vốn/ly = 45k/15 + 10k/8 + 17k/30 + 3k/10 = 5.1k → bán 26k (lời >2× vốn). Mở 38 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'ca_phe_cot_dua', name: 'Cà phê cốt dừa', icon: '🥥', unlock: 38, price: 26_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_dua_cot_hop', cups: 8 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1348: Trà chanh — món hè trứ danh (trà + chanh không hạt, khác hẳn nước chanh): vốn/ly = 20k/40 +
  // 10k/8 + 17k/30 + 3k/10 = 2.6k → bán 12k (lời >2× vốn). Mở 31 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'tra_chanh', name: 'Trà chanh', icon: '🍋', unlock: 31, price: 12_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_chanh_khong_hat', cups: 8 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1349: Sữa chua đá — món mát Sài Gòn trứ danh (sữa chua đánh đá cùng sữa tươi, khác bếp xay vì đây là
  // món PHA mát): vốn/ly = 5k/3 + 28k/6 + 17k/30 + 3k/10 = 7.2k → bán 20k (lời >2× vốn). Mở 33 > mốc golden 30
  // → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sua_chua_da', name: 'Sữa chua đá', icon: '🥛', unlock: 33, price: 20_000, uses: [{ id: 'suachua', cups: 3 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1353: Sinh tố yến mạch chuối — trend sức khỏe (sữa yến mạch hộp + chuối nông trại xay đá):
  // vốn/ly = 45k/6 + 12k/4 + 3k/10 = 10.8k → bán 30k (lời >2× vốn). Mở 73 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sinh_to_yen_mach_chuoi', name: 'Sinh tố yến mạch chuối', icon: '🍌', unlock: 73, price: 30_000, uses: [{ id: 'sua_yeu', cups: 6 }, { id: 'x_chuoi', cups: 4 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1354: Nước ép dưa hấu — món hè giải nhiệt kinh điển (dưa hấu nông trại ép lạnh, chưa có lối ra pha):
  // vốn/ly = 30k/4 + 3k/10 = 7.8k → bán 24k (lời >2× vốn). Mở 31 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'ep_dua_hau', name: 'Nước ép dưa hấu', icon: '🍉', unlock: 31, price: 24_000, uses: [{ id: 'dua', cups: 4 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1356: Cà phê phin — pha truyền thống đậm chất Sài Gòn (cà phê xay nguyên chất nhỏ giọt phin, chưa có
  // lối ra pha): vốn/ly = 150k/30 + 17k/30 + 3k/10 = 5.9k → bán 30k (lời >2× vốn). Mở 64 > mốc golden 30
  // → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'ca_phe_phin', name: 'Cà phê phin', icon: '☕', unlock: 64, price: 30_000, uses: [{ id: 'ca_phe_xay', cups: 30 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1357: Sinh tố ngũ cốc — bowl sức khỏe trứ danh (granola hộp + sữa tươi xay đá):
  // vốn/ly = 130k/20 + 28k/6 + 3k/10 = 11.2k → bán 32k (lời >2× vốn). Mở 68 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sinh_to_ngu_coc', name: 'Sinh tố ngũ cốc', icon: '🥣', unlock: 68, price: 32_000, uses: [{ id: 'ngu_coc', cups: 20 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1361: Trà atiso đá — món giải nhiệt tốt gan trứ danh (trà atiso túi chưa có lối ra pha):
  // vốn/ly = 38k/10 + 17k/30 + 3k/10 = 4.7k → bán 16k (lời >2× vốn). Mở 44 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'atiso_da', name: 'Trà atiso đá', icon: '🌿', unlock: 44, price: 16_000, uses: [{ id: 'tra_atiso', cups: 10 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1362: Trà thảo mộc đá — trà lành đá mát (hộp thảo mộc chưa có lối ra pha):
  // vốn/ly = 65k/10 + 17k/30 + 3k/10 = 7.4k → bán 22k (lời >2× vốn). Mở 59 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'thao_moc_da', name: 'Trà thảo mộc đá', icon: '🍃', unlock: 59, price: 22_000, uses: [{ id: 'tra_thao_moc', cups: 10 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1371: Sữa chua yến mạch — đồ uống healthy trứ danh (ghép sữa chua đánh đá + yến mạch hộp):
  // vốn/ly = 5k/3 + 45k/12 + 3k/10 = 5.7k → bán 22k (lời >2× vốn). Mở 41 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sua_chua_yen_mach', name: 'Sữa chua yến mạch', icon: '🥣', unlock: 41, price: 22_000, uses: [{ id: 'suachua', cups: 3 }, { id: 'yen_mach', cups: 12 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1372: Sữa hạt đá — đồ uống healthy kinh điển (sữa hạt lốc pha đá mát, chưa có lối ra pha):
  // vốn/ly = 42k/8 + 3k/10 = 5.6k → bán 20k (lời >2× vốn). Mở 41 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sua_hat_da', name: 'Sữa hạt đá', icon: '🥜', unlock: 41, price: 20_000, uses: [{ id: 'sua_hat', cups: 8 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1373: Trà sữa trân châu đường đen — món trà sữa QUỐC DÂN (viên trân châu nấu từ bột mì + đường đen):
  // vốn/ly = 28k/6 + 20k/40 + 18k/6 + 17k/30 + 3k/10 = 9k → bán 28k (lời >2× vốn). Mở 38 > mốc golden 30
  // → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'tra_sua_tran_chau', name: 'Trà sữa trân châu đường đen', icon: '🧋', unlock: 38, price: 28_000, uses: [{ id: 'sua_tuoi', cups: 6 }, { id: 'tra', cups: 40 }, { id: 'botmi', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1374: Nước mía cốt dừa — món hè trend trứ danh (mía ép cùng nước cốt dừa béo ngậy):
  // vốn/ly = 12k/4 + 10k/8 + 3k/10 = 4.6k → bán 18k (lời >2× vốn). Mở 32 > mốc golden 30 → sim không đổi;
  // KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'mia_cot_dua', name: 'Nước mía cốt dừa', icon: '🎋', unlock: 32, price: 18_000, uses: [{ id: 'mia', cups: 4 }, { id: 'x_dua_cot_hop', cups: 8 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1378: Sữa bắp — món ngọt Đà Lạt trứ danh (bắp ngô xay cùng sữa tươi):
  // vốn/ly = 8k/4 + 28k/6 + 17k/30 + 3k/10 = 7.5k → bán 22k (lời >2× vốn). Mở 31 > mốc golden 30
  // → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sua_bap_da', name: 'Sữa bắp', icon: '🌽', unlock: 31, price: 22_000, uses: [{ id: 'bap', cups: 4 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1388: Cà phê mocha — món trend cà phê × cacao (đậm cà phê hòa quyện ca cao + sữa đặc):
  // vốn/ly = 45k/15 + 24k/10 + 22k/10 + 3k/10 = 9.2k → bán 30k (lời >2× vốn). Mở 36 > mốc golden 30
  // → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'ca_phe_mocha', name: 'Cà phê mocha', icon: '☕', unlock: 36, price: 30_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_bot_cacao', cups: 10 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1382: Sữa chua cam — món Đà Lạt mát lành (sữa chua đánh cùng cam vắt):
  // vốn/ly = 5k/3 + 10k/5 + 17k/30 + 3k/10 = 4.5k → bán 24k (lời >2× vốn). Mở 34 > mốc golden 30
  // → sim không đổi; KHÔNG hot (giữ đếm đồ nóng = 3).
  { id: 'sua_chua_cam', name: 'Sữa chua cam', icon: '🍊', unlock: 34, price: 24_000, uses: [{ id: 'suachua', cups: 3 }, { id: 'x_cam', cups: 5 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_muoi', name: 'Cà phê muối', icon: '🧂', unlock: 40, price: 28_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_muoi', cups: 60 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'tra_gung', name: 'Trà gừng nóng', icon: '🫚', unlock: 36, price: 15_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_gung', cups: 12 }, { id: 'x_duong', cups: 30 }], hot: true },
  // GĐ1663: cam gừng đá — gừng trại có món mát (trước chỉ trà gừng nóng); giữ nguyên 3 đồ nóng.
  { id: 'cam_gung_da', name: 'Cam gừng đá', icon: '🍊', unlock: 37, price: 24_000, uses: [{ id: 'x_cam', cups: 3 }, { id: 'x_gung', cups: 12 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'tra_sa_da', name: 'Trà sả đá', icon: '🌿', unlock: 40, price: 15_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_sa', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] }, // GĐ1703: lối ra quán cho sả
  // GĐ1666: nước ép gấc — gấc trại có lối ra thứ hai (sau xôi gấc).
  { id: 'ep_gac_da', name: 'Nước ép gấc', icon: '🔴', unlock: 43, price: 26_000, uses: [{ id: 'x_gac', cups: 4 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_sua_nong', name: 'Cà phê sữa nóng', icon: '♨️', unlock: 37, price: 20_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_sua_dac', cups: 10 }], hot: true },
  // GĐ1650: nước ép thơm — thêm món mát dùng thơm có sẵn (chiều sâu quán nước; giữ nguyên 3 đồ nóng).
  { id: 'ep_thom_da', name: 'Nước ép thơm', icon: '🍍', unlock: 35, price: 22_000, uses: [{ id: 'x_thom', cups: 4 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  // GĐ1658: sữa dê đá — sữa dê trại (trước chỉ 1 lối ra bếp) vào quán nước.
  { id: 'sua_de_da', name: 'Sữa dê đá', icon: '🐐', unlock: 36, price: 24_000, uses: [{ id: 'sua_de', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_cao_nong', name: 'Ca cao nóng', icon: '☕', unlock: 38, price: 22_000, uses: [{ id: 'x_bot_cacao', cups: 10 }, { id: 'sua_tuoi', cups: 6 }], hot: true },
  // GĐ1436: món quán từ trái cây catalog (trước chỉ có lối ra bếp) — mở > 30 nên sim golden không đổi.
  { id: 'tra_dua_da', name: 'Trà dứa', icon: '🍍', unlock: 34, price: 22_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_thom', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ep_tao_da', name: 'Nước ép táo đá', icon: '🍎', unlock: 33, price: 22_000, uses: [{ id: 'x_tao', cups: 4 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'sinh_to_bo_quan', name: 'Sinh tố bơ sữa đặc', icon: '🥑', unlock: 35, price: 28_000, uses: [{ id: 'x_bo', cups: 3 }, { id: 'x_sua_dac', cups: 20 }, { id: 'x_nuoc_da', cups: 10 }] },
];

/** Số món tối đa trên thực đơn. */
export const QUAN_MENU_SLOTS = 4;
/** Mỗi món thêm trên thực đơn (từ món thứ hai) kéo thêm 8% khách. */
export const QUAN_VARIETY_BONUS = 0.08;

export const quanRecipeById = (id: string) => QUAN_RECIPES.find((r) => r.id === id);
export const quanRecipesAt = (level: number) => QUAN_RECIPES.filter((r) => level >= r.unlock);

/** Thực đơn hợp lệ: bỏ id lạ / chưa mở / trùng, cắt theo số ô. */
export function cleanMenu(menu: readonly string[] | undefined, level: number, slots = QUAN_MENU_SLOTS): string[] {
  const out: string[] = [];
  for (const id of menu ?? []) {
    const r = quanRecipeById(id);
    if (r && level >= r.unlock && !out.includes(id)) out.push(id);
  }
  return out.slice(0, slots);
}

/** Dòng chữ bảng phấn trên quầy 3D (GĐ416): tên món + giá nghìn đồng; chưa chọn món = nước chai. */
export const menuBoardLines = (menu: readonly string[] | undefined): string[] => {
  const rs = (menu ?? []).map(quanRecipeById).filter((r): r is QuanRecipe => !!r);
  return rs.length ? rs.map((r) => `${r.name} ${r.price / 1000}k`) : ['Nước giải khát chai'];
};

/** GĐ476: mưa/bão mà thực đơn có đồ nóng thì khách ghé thêm 20%. */
export const quanHotMul = (menu: readonly string[], weather?: string, day?: number) => {
  if (!menu.some((id) => quanRecipeById(id)?.hot)) return 1;
  if (weather === 'rain' || weather === 'storm') return 1.2;
  /** GĐ481: tháng rét (12, 1, 2) đồ nóng vẫn kéo thêm 10% khách. */
  return day !== undefined && [12, 1, 2].includes(monthOf(day)) ? 1.1 : 1;
};

/** GĐ477: dòng nhắc ngày mưa trong panel quán (null = không cần nhắc). */
export function quanHotNote(menu: readonly string[], weather: string | undefined, level: number, day?: number): string | null {
  const rain = weather === 'rain' || weather === 'storm';
  const cold = day !== undefined && [12, 1, 2].includes(monthOf(day));
  if (!rain && !cold) return null;
  const mul = rain ? 1.2 : 1.1;
  if (quanHotMul(menu, weather, day) > 1) return `🫚 Có đồ nóng trên thực đơn: thêm khách ×${mul}`;
  const hot = QUAN_RECIPES.find((r) => r.hot && level >= r.unlock);
  return hot ? `🫚 ${rain ? 'Trời mưa' : 'Tháng rét'}: thêm ${hot.name} vào thực đơn để kéo khách ×${mul}` : null;
}

/** Hệ số khách theo độ đa dạng thực đơn: 1 món ×1, 4 món ×1.24. */
export const varietyMul = (menuSize: number) => 1 + QUAN_VARIETY_BONUS * Math.max(0, menuSize - 1);

/** Số ly tối đa pha được của một công thức với kho hiện có (thiếu một nguyên liệu = 0). */
export function recipeCapacity(r: QuanRecipe, storage: Record<string, number>): number {
  return Math.min(...r.uses.map((u) => Math.floor((storage[u.id] ?? 0) * u.cups)));
}

/**
 * GĐ1112 — nguyên liệu NÚT THẮT của một công thức (kho × cups nhỏ nhất — mua đúng thứ đó mới pha
 * thêm ly). Thuần đọc.
 */
export function recipeBottleneck(r: QuanRecipe, storage: Record<string, number>): { id: string; name: string; glasses: number } {
  let worst = r.uses[0];
  for (const u of r.uses) {
    if (Math.floor((storage[u.id] ?? 0) * u.cups) < Math.floor((storage[worst.id] ?? 0) * worst.cups)) worst = u;
  }
  return { id: worst.id, name: productById(worst.id).name, glasses: Math.floor((storage[worst.id] ?? 0) * worst.cups) };
}

/** Giá vốn nguyên liệu một ly (để người chơi so lời với nước chai). */
export const recipeCupCost = (r: QuanRecipe) => r.uses.reduce((n, u) => n + productById(u.id).buy / u.cups, 0);

export interface BrewResult { cups: Record<string, number>; total: number; revenue: number; short: string[] }

/**
 * Pha `wanted` ly chia đều cho các món trên thực đơn (dư thì món đứng trước nhận trước). Mỗi món pha
 * tối đa tới sức chứa nguyên liệu, rút kho qua `take` (làm tròn LÊN số đơn vị nguyên liệu đã mở).
 * Món thiếu nguyên liệu ghi vào `short`; phần khách không được phục vụ trả về cho nước chai lo.
 * Tính trên bản sao `storage` để các món sau thấy kho còn lại (đá, đường dùng chung); kho thật chỉ đổi qua `take`.
 */
export function brewMenu(
  menu: readonly string[], storage: Record<string, number>, wanted: number, priceMul: number,
  take: (id: string, qty: number) => void,
): BrewResult {
  const left = { ...storage };
  const cups: Record<string, number> = {};
  const short: string[] = [];
  let total = 0;
  let revenue = 0;
  const recipes = menu.map(quanRecipeById).filter((r): r is QuanRecipe => !!r);
  recipes.forEach((r, i) => {
    const want = Math.floor(wanted / recipes.length) + (i < wanted % recipes.length ? 1 : 0);
    const n = Math.min(want, recipeCapacity(r, left));
    if (n < want) short.push(r.id);
    if (n <= 0) return;
    for (const u of r.uses) {
      const units = Math.min(left[u.id] ?? 0, Math.ceil(n / u.cups));
      left[u.id] = (left[u.id] ?? 0) - units;
      take(u.id, units);
    }
    cups[r.id] = n;
    total += n;
    revenue += n * r.price * priceMul;
  });
  return { cups, total, revenue: Math.round(revenue), short };
}
