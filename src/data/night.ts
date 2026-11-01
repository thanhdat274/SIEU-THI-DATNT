/**
 * Ca đêm — nâng cấp "Mở cửa 24h" cho cuối game (cấp 55+).
 * Ban đêm khách ít nhưng giờ nào cũng có doanh thu, được bán đắt hơn buổi ngày,
 * đổi lại trộm nhiều gấp đôi, nhân viên ca đêm lương cao, và thức quá nửa đêm
 * thì hôm sau dậy trễ (mất buổi sáng đông khách).
 */

/** Cấp mở khóa nâng cấp ca đêm. */
export const NIGHT_UNLOCK = 55;

/** Giá mua nâng cấp "Mở ca đêm 24h" — nguồn sự thật duy nhất (upgrades.ts + nightReport.ts dùng chung). */
export const NIGHT_UPGRADE_PRICE = 15_000_000;

/** Ban đêm người đi đường thưa: nhân lượng người đi đường theo khung (22h–24h, 0h–6h).
 *  Tổng khách đêm ≈ 8–10% khách ngày — thưa nhưng giờ nào cũng có người ghé. */
export const NIGHT_TRAFFIC = { evening: 0.15, late: 0.08 } as const;

/** Khung ca đêm nối dài qua nửa đêm (22h → 6h sáng hôm sau, tính theo phút trong ngày 24h–30h). */
export const NIGHT_SPAN = 8 * 60;

/** Ngoài ngày thường (6h–22h) mới tính là ban đêm. */
export const isNight = (minutes: number) => minutes >= 22 * 60 || minutes < 6 * 60;

/** Nhân lượng khách ban đêm; trả null nếu là buổi ngày (dùng TIME_BANDS như thường). */
export const nightTrafficAt = (minutes: number): number | null => {
  if (!isNight(minutes)) return null;
  return minutes >= 22 * 60 ? NIGHT_TRAFFIC.evening : NIGHT_TRAFFIC.late;
};

/** Ban đêm bán được đắt hơn buổi ngày chừng này (khách khuya lười trả giá). */
export const NIGHT_PRICE_MUL = 1.15;

/** Nhân viên nhận ca đêm được lương gấp bấy nhiêu lần ca ngày. */
export const NIGHT_WAGE_MUL = 1.5;

/** Khuya tối tăm mặt đường, kẻ trộm hoạt động gấp đôi. */
export const NIGHT_THEFT_MUL = 2;

/** Ngủ sau nửa đêm thì hôm sau dậy trễ tới giờ này (mất buổi sáng). */
export const LATE_WAKE_AT = 8 * 60;
