export interface ArrivalWeights {
  walk: number;
  motorbike: number;
  car: number;
}

/** Tỷ trọng cơ bản trời khô: khớp bảng cũ (xe máy 45%, ô tô 7%, đi bộ 48%). */
export const ARRIVAL_BASE_WEIGHTS: ArrivalWeights = { walk: 0.48, motorbike: 0.45, car: 0.07 };

export interface ArrivalTimeBand {
  id: string;
  label: string;
  /** Từ giờ này (bao gồm) đến giờ này (không bao gồm). */
  fromHour: number;
  toHour: number;
  /** Hệ số nhân lên tỷ trọng từng phương thức. */
  multiplier: ArrivalWeights;
}

/** Hệ số theo khung giờ: cao điểm nhiều xe máy, chiều tối nhiều ô tô (đi chợ cả nhà), trưa nhiều người đi bộ. */
export const ARRIVAL_TIME_BANDS: readonly ArrivalTimeBand[] = [
  { id: 'morning_rush', label: 'Cao điểm sáng', fromHour: 7, toHour: 9, multiplier: { walk: 0.9, motorbike: 1.25, car: 0.8 } },
  { id: 'lunch', label: 'Giờ trưa', fromHour: 11, toHour: 13, multiplier: { walk: 1.15, motorbike: 1, car: 1 } },
  { id: 'evening_rush', label: 'Cao điểm chiều', fromHour: 17, toHour: 19, multiplier: { walk: 0.8, motorbike: 1.3, car: 1.4 } },
  { id: 'evening', label: 'Tối', fromHour: 19, toHour: 22, multiplier: { walk: 0.8, motorbike: 0.85, car: 1.8 } },
];

/** Thứ Bảy và Chủ Nhật (chỉ số thứ 5 và 6 theo `weekdayOf`): nhiều ô tô và người đi bộ hơn. */
export const ARRIVAL_WEEKEND = { weekdays: [5, 6], multiplier: { walk: 1.1, motorbike: 0.9, car: 1.8 } as ArrivalWeights } as const;

/** Mưa (cường độ r từ 0 đến 1): người đi bộ giảm mạnh, xe máy giảm nhẹ, ô tô tăng. */
export const ARRIVAL_RAIN = { walkPenalty: 0.75, motorbikePenalty: 0.1, carBonus: 2.5 } as const;
