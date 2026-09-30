import type { StorageType } from '@game/shared';

export interface SpoilageCondition {
  id: string;
  label: string;
  storage: StorageType;
  /** Chỉ áp dụng khi có (true) hoặc không có (false) mất điện; bỏ trống = không phân biệt. */
  powerOutage?: boolean;
  /** Chỉ áp dụng khi thời tiết thuộc danh sách này. */
  weather?: string[];
  /** Số ngày hạn dùng bị trừ mỗi ngày game (1 = bình thường). */
  rate: number;
}

/** Điều kiện xét từ trên xuống, dòng đầu khớp thì dùng. Hệ số sự kiện (kênh `spoilage`) nhân thêm theo nhóm hàng. */
export const SPOILAGE_CONDITIONS: readonly SpoilageCondition[] = [
  { id: 'cold_unpowered', label: 'Tủ mát mất điện', storage: 'cold', powerOutage: true, rate: 1.2 },
  { id: 'cold_powered', label: 'Tủ mát có điện', storage: 'cold', rate: 1 },
  { id: 'ambient_hot', label: 'Kho thường khi trời nóng', storage: 'ambient', weather: ['hot'], rate: 1.15 },
  { id: 'ambient', label: 'Kho thường', storage: 'ambient', rate: 1 },
];

export const SPOILAGE_RULES = {
  /** Uy tín mất khi khách lấy phải món đã quá hạn còn trên kệ. */
  expiredOnShelfReputationLoss: 2,
  /** Cảnh báo khi còn tối đa số ngày này là hết hạn. */
  expiringSoonDays: 2,
  /** Hao tối đa mỗi ngày (ngày), tránh một ngày mất điện xóa cả lô hạn dài. */
  maxDaysLostPerDay: 4,
} as const;

export function validateSpoilageData(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const c of SPOILAGE_CONDITIONS) {
    if (seen.has(c.id)) errors.push(`spoilage ${c.id}: trùng id`);
    seen.add(c.id);
    if (!(c.rate >= 1 && c.rate <= 4)) errors.push(`spoilage ${c.id}: rate ngoài [1, 4]`);
  }
  for (const storage of ['cold', 'ambient'] as const) {
    const last = [...SPOILAGE_CONDITIONS].reverse().find(c => c.storage === storage);
    if (!last || last.powerOutage !== undefined || last.weather) errors.push(`spoilage: thiếu điều kiện mặc định cho kho ${storage}`);
  }
  return errors;
}
