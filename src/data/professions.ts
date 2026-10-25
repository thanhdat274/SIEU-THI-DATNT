import type { CharacterArchetype, PropKind } from '../render/characterModel';

/** Nghề của khách vãng lai: quyết định ngoại hình, giờ hay ghé và thói quen mua hàng. */
export interface ProfessionDef {
  id: string;
  name: string;
  icon: string;
  archetype: CharacterArchetype;
  /** Các khung giờ hay ghé (phút trong ngày); ngoài khung này hiếm khi gặp. */
  hours: [number, number][];
  /** Món hay mua, theo thứ tự ưu tiên; món chưa mở khóa bị bỏ qua. */
  likes: string[];
  /** Tỉ lệ mỗi món trong giỏ là món ưa thích. */
  loyalty: number;
  /** Số món thêm/bớt so với khách thường. */
  extraItems: number;
  /** Nhân với độ nhạy giá (thấp = ít so đo giá). */
  sensitivity: number;
  /** Sốt ruột hơn hay kiên nhẫn hơn khi xếp hàng (nhân với thời gian chờ). */
  patience: number;
}

const h = (from: number, to: number): [number, number] => [from * 60, to * 60];

export const PROFESSIONS: ProfessionDef[] = [
  {
    id: 'construction', name: 'Công nhân xây dựng', icon: '👷', archetype: 'construction_worker',
    hours: [h(5.5, 7.5), h(11, 12.5), h(17, 19)],
    likes: ['mi', 'tangluc', 'nuoc', 'banhmi', 'x_redbull_lon', 'x_sting_dau', 'x_nuoc_dien_giai', 'x_tra_da', 'banh_mi_trung_nuong', 'nuoc_mia', 'com_chien_trung'],
    loyalty: 0.75, extraItems: 0, sensitivity: 1.2, patience: 0.8,
  },
  {
    id: 'nurse', name: 'Y tá', icon: '🩺', archetype: 'nurse',
    hours: [h(6, 7.5), h(19, 22)],
    likes: ['caphe', 'x_ca_phe_lon', 'banhmi', 'x_khau_trang', 'x_nuoc_rua_tay', 'suachua', 'sua', 'mi_trung_nong'],
    loyalty: 0.7, extraItems: 0, sensitivity: 0.9, patience: 0.7,
  },
  {
    id: 'shipper', name: 'Shipper', icon: '🛵', archetype: 'shipper',
    hours: [h(10.5, 14), h(17, 21)],
    likes: ['nuoc', 'x_aquafina_chai', 'x_revive_chai', 'x_pocari_sweat', 'x_ao_mua', 'x_sim_dt', 'x_the_cao', 'banhmi', 'nuoc_mia', 'banh_mi_trung_nuong'],
    loyalty: 0.8, extraItems: -1, sensitivity: 1, patience: 0.5,
  },
  {
    id: 'chef', name: 'Đầu bếp quán ăn', icon: '👨‍🍳', archetype: 'chef',
    hours: [h(5, 8), h(14, 16)],
    likes: ['giavi', 'dauan', 'nuocmam', 'trung', 'gao', 'rau', 'thit', 'x_hat_nem', 'x_bot_ngot', 'x_toi', 'x_hanh_kho'],
    loyalty: 0.85, extraItems: 3, sensitivity: 1.1, patience: 1.1,
  },
  {
    id: 'mom', name: 'Mẹ bỉm sữa', icon: '🤱', archetype: 'young_mom',
    hours: [h(8.5, 10.5), h(15.5, 18)],
    likes: ['sua', 'x_ta_giay', 'x_sua_bot_tre_em', 'x_khan_uot', 'trung', 'rau', 'traicay', 'x_yakult', 'che_dau_xanh', 'sinh_to_trai_cay', 'banh_bao_hap'],
    loyalty: 0.7, extraItems: 2, sensitivity: 1.15, patience: 0.9,
  },
  {
    id: 'guard', name: 'Bảo vệ', icon: '💂', archetype: 'security_guard',
    hours: [h(18, 22), h(5.5, 7)],
    likes: ['x_tra_da', 'caphe', 'x_ca_phe_lon', 'bimbim', 'x_hat_dua', 'mi', 'x_bat_lua', 'mi_trung_nong', 'ca_phe_den_da', 'xuc_xich_nuong'],
    loyalty: 0.75, extraItems: 0, sensitivity: 1, patience: 1.3,
  },
  {
    id: 'teacher', name: 'Giáo viên', icon: '👩‍🏫', archetype: 'teacher',
    hours: [h(6.5, 7.5), h(11, 12), h(16.5, 18)],
    likes: ['x_tap_vo', 'x_but_bi', 'nuoc', 'tra', 'x_tra_xanh', 'banh', 'traicay'],
    loyalty: 0.7, extraItems: 0, sensitivity: 0.95, patience: 1.1,
  },
  {
    id: 'farmer', name: 'Người bán chợ', icon: '🧺', archetype: 'farmer',
    hours: [h(4.5, 7), h(12, 13.5)],
    likes: ['x_tui_rac', 'x_bao_goi', 'nuoc', 'x_tra_da', 'mi', 'x_nhang', 'gao', 'banh_mi_trung_nuong'],
    loyalty: 0.75, extraItems: 1, sensitivity: 1.3, patience: 1.2,
  },
  {
    id: 'athlete', name: 'Dân chạy bộ', icon: '🏃', archetype: 'athlete',
    hours: [h(5, 7), h(17, 19)],
    likes: ['x_nuoc_dien_giai', 'x_pocari_sweat', 'x_revive_chai', 'nuoc', 'x_chuoi', 'x_yen_mach', 'sua'],
    loyalty: 0.8, extraItems: -1, sensitivity: 0.9, patience: 0.6,
  },
  {
    id: 'barber', name: 'Thợ cắt tóc', icon: '💇', archetype: 'barber',
    hours: [h(7.5, 10), h(13, 15), h(18, 20.5)],
    likes: ['caphe', 'x_ca_phe_lon', 'nuoc', 'x_tra_da', 'banh', 'traicay', 'daugoi', 'xaphong'],
    loyalty: 0.7, extraItems: 0, sensitivity: 1, patience: 1.2,
  },
  {
    id: 'mechanic', name: 'Thợ sửa xe', icon: '🔧', archetype: 'mechanic',
    hours: [h(6, 8.5), h(11.5, 13.5), h(17, 19.5)],
    likes: ['mi', 'tangluc', 'nuoc', 'x_tra_da', 'caphe', 'x_redbull_lon', 'banhmi', 'x_nuoc_dien_giai'],
    loyalty: 0.8, extraItems: 0, sensitivity: 1.15, patience: 0.9,
  },
  {
    id: 'electrician', name: 'Thợ điện', icon: '🔌', archetype: 'electrician',
    hours: [h(7, 9), h(12, 14), h(17.5, 19.5)],
    likes: ['nuoc', 'x_tra_da', 'caphe', 'bimbim', 'x_hat_dua', 'mi', 'x_bat_lua', 'x_pin'],
    loyalty: 0.75, extraItems: 0, sensitivity: 1.1, patience: 1,
  },
  {
    id: 'police', name: 'Công an', icon: '👮', archetype: 'police',
    hours: [h(6.5, 8), h(11, 12.5), h(18.5, 21.5)],
    likes: ['caphe', 'x_ca_phe_lon', 'nuoc', 'x_tra_da', 'banh', 'x_khan_giay', 'x_khau_trang', 'x_the_cao'],
    loyalty: 0.7, extraItems: 0, sensitivity: 0.9, patience: 1.3,
  },
  {
    id: 'soldier', name: 'Bộ đội', icon: '🪖', archetype: 'soldier',
    hours: [h(5.5, 7.5), h(17, 20)],
    likes: ['sua', 'banh', 'gao', 'mi', 'x_sua_dac', 'x_ca_hop', 'nuoc', 'x_khau_trang'],
    loyalty: 0.75, extraItems: 2, sensitivity: 0.85, patience: 1.4,
  },
  {
    id: 'barista', name: 'Pha chế quán nước', icon: '☕', archetype: 'barista',
    hours: [h(6, 9), h(13, 15.5), h(19, 22)],
    likes: ['sua', 'x_sua_dac', 'caphe', 'x_ca_phe_lon', 'x_tra_xanh', 'duong', 'x_duong', 'sinhto'],
    loyalty: 0.7, extraItems: 0, sensitivity: 1, patience: 1,
  },
  {
    id: 'doctor', name: 'Bác sĩ', icon: '🧑‍⚕️', archetype: 'doctor',
    hours: [h(7, 9), h(11.5, 13), h(17.5, 20)],
    likes: ['caphe', 'x_ca_phe_lon', 'banhmi', 'x_khau_trang', 'x_nuoc_rua_tay', 'sua', 'traicay', 'x_nuoc_dien_giai'],
    loyalty: 0.7, extraItems: 0, sensitivity: 0.9, patience: 1.1,
  },
  {
    id: 'banker', name: 'Nhân viên ngân hàng', icon: '🏦', archetype: 'banker',
    hours: [h(7, 9), h(11.5, 13.5), h(17, 19)],
    likes: ['caphe', 'x_ca_phe_lon', 'nuoc', 'x_tra_xanh', 'banh', 'traicay', 'x_khan_giay', 'x_the_cao'],
    loyalty: 0.75, extraItems: 0, sensitivity: 0.85, patience: 1.2,
  },
  // ──────────────────────────────────────────────
  // NGHỀ MỚI – mở rộng từ 17 lên 30+
  // ──────────────────────────────────────────────

  {
    id: 'student_highschool', name: 'Học sinh cấp 3', icon: '🎒', archetype: 'student_boy',
    hours: [h(11, 11.5), h(15, 17.5)],
    likes: ['banh', 'bimbim', 'ngot', 'nuoc', 'x_chuoi', 'x_tra_sua', 'x_phomai', 'che_dau_xanh', 'banh_trang_tron', 'tra_sua', 'ca_vien_chien'],
    loyalty: 0.8, extraItems: 0, sensitivity: 1.4, patience: 1.0,
  },
  {
    id: 'student_college', name: 'Sinh viên', icon: '📚', archetype: 'coder_guy',
    hours: [h(18, 22), h(13, 15)],
    likes: ['caphe', 'x_ca_phe_lon', 'mi', 'nuoc', 'bimbim', 'x_tra_sua', 'x_revive_chai', 'tra_sua', 'mi_trung_nong', 'ca_phe_sua_da', 'ca_vien_chien'],
    loyalty: 0.75, extraItems: 0, sensitivity: 1.2, patience: 1.3,
  },
  {
    id: 'influencer', name: 'Influencer', icon: '📱', archetype: 'influencer',
    hours: [h(9, 12), h(15, 18)],
    likes: ['x_tra_sua', 'x_tra_xanh', 'traicay', 'sinhto', 'x_phomai', 'banh', 'tra_dao_cam_sa', 'kem_trai_cay', 'tra_sua'],
    loyalty: 0.6, extraItems: 1, sensitivity: 0.5, patience: 1.5,
  },
  {
    id: 'freelancer', name: 'Freelancer', icon: '💻', archetype: 'coder_guy',
    hours: [h(8, 18)],
    likes: ['caphe', 'x_ca_phe_lon', 'nuoc', 'tra', 'x_tra_xanh', 'banh', 'suachua'],
    loyalty: 0.8, extraItems: 0, sensitivity: 0.9, patience: 1.5,
  },
  {
    id: 'bus_driver', name: 'Tài xế xe bus', icon: '🚌', archetype: 'bus_driver',
    hours: [h(5, 8), h(17, 20)],
    likes: ['nuoc', 'banhmi', 'caphe', 'x_tra_da', 'mi', 'x_redbull_lon', 'banh_mi_trung_nuong', 'ca_phe_den_da'],
    loyalty: 0.75, extraItems: 0, sensitivity: 1.1, patience: 1.0,
  },
  {
    id: 'taxi_driver', name: 'Tài xế taxi/Grab', icon: '🚕', archetype: 'taxi_driver',
    hours: [h(5, 12), h(15, 22)],
    likes: ['nuoc', 'tangluc', 'mi', 'banhmi', 'x_tra_da', 'x_redbull_lon', 'caphe', 'ca_phe_den_da', 'banh_mi_trung_nuong'],
    loyalty: 0.8, extraItems: -1, sensitivity: 1.0, patience: 0.7,
  },
  {
    id: 'traffic_police', name: 'Cảnh sát giao thông', icon: '👮‍♂️', archetype: 'police',
    hours: [h(5, 9), h(16, 20)],
    likes: ['x_tra_da', 'nuoc', 'banhmi', 'caphe', 'bimbim'],
    loyalty: 0.7, extraItems: 0, sensitivity: 1.0, patience: 1.4,
  },
  {
    id: 'reporter', name: 'Phóng viên địa phương', icon: '📝', archetype: 'gentleman',
    hours: [h(7, 10), h(14, 17)],
    likes: ['caphe', 'x_ca_phe_lon', 'tra', 'banh', 'nuoc', 'x_khan_giay'],
    loyalty: 0.7, extraItems: 0, sensitivity: 0.9, patience: 1.2,
  },
  {
    id: 'tailor', name: 'Thợ may', icon: '✂️', archetype: 'tailor',
    hours: [h(8, 12), h(14, 18)],
    likes: ['caphe', 'nuoc', 'tra', 'banh', 'x_tra_da'],
    loyalty: 0.8, extraItems: 0, sensitivity: 1.0, patience: 1.3,
  },
  {
    id: 'street_hairstylist', name: 'Hớt tóc vỉa hè', icon: '✂️', archetype: 'barber',
    hours: [h(6, 10), h(15, 18)],
    likes: ['nuoc', 'x_tra_da', 'caphe', 'bimbim', 'x_hat_dua'],
    loyalty: 0.7, extraItems: 0, sensitivity: 1.2, patience: 1.1,
  },
  {
    id: 'monk', name: 'Sư thầy', icon: '🙏', archetype: 'monk',
    hours: [h(4.5, 7), h(15, 17)],
    likes: ['tra', 'x_tra_xanh', 'chuoi', 'traicay', 'suachua', 'x_yakult'],
    loyalty: 0.85, extraItems: 0, sensitivity: 0.5, patience: 2.0,
  },
  {
    id: 'fisherman', name: 'Ngư dân', icon: '🎣', archetype: 'fisherman',
    hours: [h(3.5, 7), h(16, 18)],
    likes: ['nuoc', 'mi', 'tangluc', 'banhmi', 'x_tra_da', 'x_redbull_lon'],
    loyalty: 0.75, extraItems: 1, sensitivity: 1.3, patience: 0.9,
  },
  {
    id: 'fitness_trainer', name: 'Huấn luyện viên gym', icon: '💪', archetype: 'athlete',
    hours: [h(6, 9), h(15, 21)],
    likes: ['x_nuoc_dien_giai', 'x_pocari_sweat', 'sua', 'x_revive_chai', 'traicay', 'x_yen_mach', 'sinh_to_trai_cay', 'com_hop_ga'],
    loyalty: 0.8, extraItems: 0, sensitivity: 0.8, patience: 0.7,
  },
  {
    id: 'office_worker', name: 'Nhân viên văn phòng', icon: '👩‍💼', archetype: 'office_lady',
    hours: [h(7, 9), h(11.5, 13), h(17.5, 19.5)],
    likes: ['caphe', 'x_ca_phe_lon', 'suachua', 'banhmi', 'nuoc', 'x_tra_xanh', 'traicay', 'com_hop_ga', 'ca_phe_sua_da', 'sinh_to_trai_cay'],
    loyalty: 0.75, extraItems: 0, sensitivity: 0.85, patience: 1.1,
  },
  {
    id: 'online_seller', name: 'Bán hàng online', icon: '📦', archetype: 'online_seller',
    hours: [h(8, 18)],
    likes: ['x_ta_giay', 'x_bao_goi', 'x_khan_giay', 'x_tui_rac', 'x_tra_da', 'x_khan_uot'],
    loyalty: 0.7, extraItems: 2, sensitivity: 1.1, patience: 1.0,
  },
  {
    id: 'retired_doctor', name: 'Bác sĩ về hưu', icon: '🧑‍⚕️', archetype: 'elder_man',
    hours: [h(7, 10), h(15, 18)],
    likes: ['sua', 'tra', 'traicay', 'suachua', 'x_yakult', 'x_tra_xanh', 'caphe', 'tra_gung_nong'],
    loyalty: 0.85, extraItems: 0, sensitivity: 0.7, patience: 1.5,
  },
  {
    id: 'pho_vendor', name: 'Chủ quán phở', icon: '🍜', archetype: 'elder_woman',
    hours: [h(4, 8), h(11, 14)],
    likes: ['mi', 'giavi', 'x_toi', 'x_hanh_kho', 'thit', 'nuocmam', 'caphe'],
    loyalty: 0.8, extraItems: 2, sensitivity: 1.1, patience: 1.2,
  },
  {
    id: 'senior_citizen', name: 'Cụ già dân hẻm', icon: '👵', archetype: 'elder_woman',
    hours: [h(6, 9), h(15, 17)],
    likes: ['gao', 'mi', 'duong', 'sua', 'nuoc', 'banh', 'x_tra_da', 'che_dau_xanh', 'xoi_dau_xanh', 'tra_gung_nong'],
    loyalty: 0.9, extraItems: 1, sensitivity: 1.5, patience: 1.6,
  },
  // ───── Nghề ca đêm: chỉ gặp khi tiệm mở cửa 24h (khung giờ sau nửa đêm) ─────
  {
    id: 'bouncer', name: 'Vệ sĩ quán bar', icon: '🕺', archetype: 'security_guard',
    hours: [h(20, 24), h(0, 2)],
    likes: ['nuoc', 'bia', 'bimbim', 'x_hat_dua', 'mi', 'x_bat_lua', 'mi_trung_nong', 'xuc_xich_nuong'],
    loyalty: 0.75, extraItems: 0, sensitivity: 1, patience: 1.2,
  },
  {
    id: 'night_driver', name: 'Tài xế đêm', icon: '🌙', archetype: 'taxi_driver',
    hours: [h(21, 24), h(0, 3)],
    likes: ['caphe', 'x_ca_phe_lon', 'nuoc', 'tangluc', 'x_redbull_lon', 'x_sting_dau', 'banhmi', 'mi_trung_nong', 'xuc_xich_nuong'],
    loyalty: 0.8, extraItems: -1, sensitivity: 1, patience: 0.6,
  },
  {
    id: 'shift3_worker', name: 'Công nhân ca 3', icon: '🏭', archetype: 'construction_worker',
    hours: [h(21, 24), h(0, 6)],
    likes: ['mi', 'xuc_xich_nuong', 'bia', 'nuoc', 'caphe', 'x_ca_phe_lon', 'banhmi', 'dochin', 'snack', 'x_tra_da'],
    loyalty: 0.75, extraItems: 1, sensitivity: 1.2, patience: 1.1,
  },
];

/** Tỉ lệ khách vãng lai là người đi làm theo nghề (còn lại là dân thường). */
export const PROFESSION_SHARE = 0.55;

/**
 * Biến thể ngoại hình cho nghề đang dùng chung archetype (đổi màu áo / thêm đạo cụ thay vì dựng model mới):
 * - traffic_police: CSGT áo trắng, khác công an áo xanh
 * - fitness_trainer: áo tank đen, khác dân chạy bộ
 * - pho_vendor: tạp dề cam + giỏ quang gánh, khác cụ bà thường
 * - freelancer: hoodie xanh bạc, khác sinh viên
 * - street_hairstylist: áo choàng trắng, khác thợ cắt tóc trong tiệm
 */
export const PROFESSION_LOOK: Partial<Record<string, { topColor: number; props?: PropKind[] }>> = {
  traffic_police: { topColor: 0xf8f9fa },
  fitness_trainer: { topColor: 0x2d3436 },
  pho_vendor: { topColor: 0xe67e22, props: ['xoi_basket'] },
  freelancer: { topColor: 0x16a085 },
  street_hairstylist: { topColor: 0xecf0f1 },
  retired_doctor: { topColor: 0xecf0f1, props: ['stethoscope'] },
};

const inHours = (p: ProfessionDef, minutes: number) => p.hours.some(([a, b]) => minutes >= a && minutes < b);

/** Chọn nghề cho khách vãng lai: nghề đang giờ ghé được ưu tiên gấp 4 lần. */
/** `boosted`: nghề đang được quảng cáo nhắm tới, hay ghé gấp 3. */
export function pickProfession(minutes: number, boosted: string[] = []): ProfessionDef | null {
  if (Math.random() > PROFESSION_SHARE * (boosted.length ? 1.3 : 1)) return null;
  const weights = PROFESSIONS.map((p) => (inHours(p, minutes) ? 4 : 0.5) * (boosted.includes(p.id) ? 3 : 1));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < PROFESSIONS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return PROFESSIONS[i];
  }
  return PROFESSIONS[PROFESSIONS.length - 1];
}
