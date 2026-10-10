/**
 * Trạng thái lô đất + dữ liệu thuê (OpenSpec `open-world-land-lease`, task 1.1 — THUẦN + PROVISIONAL).
 *
 * PHẠM VI: chỉ dữ liệu thuần (type + hằng số + helper). KHÔNG nối vào validatePlacement /
 * parcelPrice / simulation / lệnh — việc nối là SAU (chờ máy thật; schema 10 đổi ownedParcelIds
 * là refactor toàn hệ phá land-reclamation, KHÔNG làm trong sandbox).
 *
 * Thiết kế (D1/D2/D4/D6, PROVISIONAL):
 *   - Lô W0 luôn owned. validatePlacement chấp nhận owned hoặc leased (ganh là SAU).
 *   - CONSTANTS provisional (xem `LAND_LEASE_CONSTANTS`).
 */

/**
 * Quyền sử dụng lô đất.
 * - `owned`: đã mua, ghi `boughtBy` người mua + `day` ngày mua.
 * - `leased`: đang thuê, ghi `leasedBy` người thuê + `sinceDay` ngày bắt đầu thuê +
 *   `paidTotal` tổng đã trả + `debtDays` số ngày nợ.
 * Lô W0 luôn là `owned` (xem thiết kế D1).
 */
export type ParcelTenure =
  | { kind: 'owned'; boughtBy: string; day: number }
  | { kind: 'leased'; leasedBy: string; sinceDay: number; paidTotal: number; debtDays: number };

/**
 * Gói hằng số cho hệ thuê đất (D2/D4/D6, PROVISIONAL — chốt sau mô phỏng/playtest).
 */
export interface LandLeaseConstants {
  /** Thuê/ngày = parcelPrice × rate. Hòa vốn mua ~50 ngày. */
  leaseDailyRate: number;
  /** Khấu trừ khi mua lô đang thuê = min(paidTotal × rate, 50% giá). */
  leaseCreditRate: number;
  /** Nợ ≥ số ngày này → closedForRent. */
  debtClosureDays: number;
  /** Mỗi tòa mở trong 16 ô +5% giá đất. */
  nearbyBonus: number;
  /** Hệ số theo cityTier 0..5. */
  tierFactor: readonly number[];
  /** Trần giá ×2,5. */
  priceCap: number;
}

/** Hằng số hệ thuê đất — PROVISIONAL (xem design 6b D2/D4/D6). */
export const LAND_LEASE_CONSTANTS: Readonly<LandLeaseConstants> = Object.freeze({
  leaseDailyRate: 0.02,
  leaseCreditRate: 0.5,
  debtClosureDays: 3,
  nearbyBonus: 0.05,
  tierFactor: Object.freeze([1, 1.1, 1.25, 1.45, 1.7, 2]),
  priceCap: 2.5,
});

/** Có phải lô đang thuê không (kind === 'leased'). */
export function isLeased(tenure: ParcelTenure): boolean {
  return tenure.kind === 'leased';
}

/** Có phải lô đã sở hữu (kind === 'owned'). */
export function isOwned(tenure: ParcelTenure): boolean {
  return tenure.kind === 'owned';
}

/**
 * Đã đạt ngưỡng đóng lô vì nợ thuê chưa: `debtDays >= DEBT_CLOSURE_DAYS`.
 * Chỉ áp dụng cho lô leased; lô owned không bao giờ đạt (không có nợ thuê).
 */
export function rentDebtThresholdMet(tenure: ParcelTenure): boolean {
  return tenure.kind === 'leased' && tenure.debtDays >= LAND_LEASE_CONSTANTS.debtClosureDays;
}
