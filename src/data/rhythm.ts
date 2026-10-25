/** Nhịp trong ngày: giờ cao điểm đông khách hơn, và mỗi khung giờ khách thèm món khác nhau. */
export interface TimeBand {
  id: string;
  name: string;
  from: number;
  to: number;
  /** Nhân lượng người đi đường. */
  traffic: number;
  /** Món khách hay mua trong khung giờ này. */
  wants: string[];
}

export const TIME_BANDS: TimeBand[] = [
  { id: 'sang', name: 'Cao điểm sáng', from: 6 * 60, to: 8 * 60 + 30, traffic: 1.6, wants: ['sua', 'banhmi', 'caphe', 'trung', 'nuoc', 'banh_mi_trung_nuong', 'xoi_man', 'xoi_trung', 'xoi_dau_xanh', 'ca_phe_sua_da', 'bac_xiu', 'banh_bao_hap', 'tra_gung_nong'] },
  { id: 'giua_sang', name: 'Giữa buổi', from: 8 * 60 + 30, to: 11 * 60, traffic: 0.6, wants: ['ca_phe_sua_da', 'banh_bao_hap', 'bap_xao'] },
  { id: 'trua', name: 'Cao điểm trưa', from: 11 * 60, to: 13 * 60, traffic: 1.35, wants: ['nuoc', 'ngot', 'mi', 'dochin', 'suachua', 'com_hop_ga', 'com_chien_trung', 'mi_trung_nong', 'ca_vien_chien', 'nuoc_mia', 'sinh_to_trai_cay'] },
  { id: 'chieu', name: 'Buổi chiều', from: 13 * 60, to: 17 * 60, traffic: 0.6, wants: ['kem', 'banh', 'snack', 'che_dau_xanh', 'banh_trang_tron', 'kem_trai_cay', 'tra_sua', 'tra_dao_cam_sa', 'bap_xao', 'ca_phe_den_da'] },
  { id: 'toi', name: 'Cao điểm tối', from: 17 * 60, to: 20 * 60, traffic: 1.7, wants: ['rau', 'thit', 'ca', 'gao', 'dauan', 'giavi', 'trung', 'com_suon_nuong', 'canh_rau_thit', 'xoi_thap_cam'] },
  { id: 'khuya', name: 'Tối muộn', from: 20 * 60, to: 22 * 60, traffic: 0.8, wants: ['mi', 'bia', 'snack', 'tangluc', 'mi_trung_nong', 'xuc_xich_nuong', 'ca_vien_chien'] },
];

/** Bình quân `traffic` cả ngày ≈ 1, nên tổng khách/ngày gần như không đổi, chỉ dồn vào giờ cao điểm. */
export const timeBandAt = (minutes: number) => TIME_BANDS.find((b) => minutes >= b.from && minutes < b.to);

// ───── Giờ vàng tự đặt (happy hour): tự chọn khung giảm giá kéo khách ─────

/** Lựa chọn của người chơi: giờ bắt đầu (9–20) và mức giảm giá (%); cửa sổ kéo dài 2 tiếng. */
export interface HappyHour { from: number; off: number }

export const HAPPY_FROM_MIN = 9;
export const HAPPY_FROM_MAX = 20;
/** Giờ vàng kéo dài bao nhiêu tiếng. */
export const HAPPY_HOURS = 2;
export const HAPPY_OFF_OPTIONS = [10, 15, 20] as const;
/** Khách kéo về thêm theo mức giảm: giảm 10% → +25% khách, giảm 20% → +50%. */
export const happyTraffic = (off: number) => 1 + (off / 100) * 2.5;

/** Giờ vàng có đang chạy ở phút này không. */
export const happyHourActive = (hh: HappyHour | null | undefined, minutes: number) =>
  !!hh && minutes >= hh.from * 60 && minutes < (hh.from + HAPPY_HOURS) * 60;
