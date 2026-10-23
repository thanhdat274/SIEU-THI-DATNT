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
  { id: 'sang', name: 'Cao điểm sáng', from: 6 * 60, to: 8 * 60 + 30, traffic: 1.6, wants: ['sua', 'banhmi', 'caphe', 'trung', 'nuoc'] },
  { id: 'giua_sang', name: 'Giữa buổi', from: 8 * 60 + 30, to: 11 * 60, traffic: 0.6, wants: [] },
  { id: 'trua', name: 'Cao điểm trưa', from: 11 * 60, to: 13 * 60, traffic: 1.35, wants: ['nuoc', 'ngot', 'mi', 'dochin', 'suachua'] },
  { id: 'chieu', name: 'Buổi chiều', from: 13 * 60, to: 17 * 60, traffic: 0.6, wants: ['kem', 'banh', 'snack'] },
  { id: 'toi', name: 'Cao điểm tối', from: 17 * 60, to: 20 * 60, traffic: 1.7, wants: ['rau', 'thit', 'ca', 'gao', 'dauan', 'giavi', 'trung'] },
  { id: 'khuya', name: 'Tối muộn', from: 20 * 60, to: 22 * 60, traffic: 0.8, wants: ['mi', 'bia', 'snack', 'tangluc'] },
];

/** Bình quân `traffic` cả ngày ≈ 1, nên tổng khách/ngày gần như không đổi, chỉ dồn vào giờ cao điểm. */
export const timeBandAt = (minutes: number) => TIME_BANDS.find((b) => minutes >= b.from && minutes < b.to);
