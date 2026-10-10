/**
 * Mô phỏng cân bằng PROVISIONAL cho 4 loại tòa thế giới mở
 * (OpenSpec `open-world-building-types` task 2.3, design D4/D9).
 *
 * Module THUẦN: KHÔNG đụng simulation.ts thật, KHÔNG import registry sibling (tránh phụ thuộc chéo) —
 * mọi số liệu được khai báo cục bộ (provisional) để chốt giá trị. Nối vào máy thật sau khi refactor 1.2
 * (BuildingId → string, buildingPlacements[].typeId) và máy thật có dữ liệu tòa.
 *
 * D4 (provisional):
 *   grocery_branch (chi nhánh tạp hóa, cấp 32, tối đa 3) — quầy bán, cùng danh mục tiệm chính.
 *   cafe (quán cà phê, cấp 34, tối đa 2)                 — trạm pha + bàn ngồi, nhịp khách cao 6–10h.
 *   parking_lot (bãi giữ xe, cấp 24, tối đa 2)          — KHÔNG quầy bán; thu phí theo xe; tòa trong bán kính
 *                                                        12 ô nhận +15% khách đi xe (mô hình arrival-mode có sẵn).
 *   com_restaurant (quán cơm/nhà hàng, cấp 40, tối đa 2) — bếp + bàn ăn, khách đông 11–13h và 17–20h.
 *
 * D9 (hạng cửa hàng theo diện tích sàn footprint): nhân hệ số nhịp khách, đơn điệu không giảm khi tòa to hơn.
 */
export type BuildingTypeId = 'grocery_branch' | 'cafe' | 'parking_lot' | 'com_restaurant';

/** Cấu hình ước lượng cân bằng cho một tòa (provisional). */
export interface BuildingBalanceConfig {
  /** Loại tòa (D4). */
  typeId: BuildingTypeId;
  /** Số ô sàn footprint của tòa — dùng để suy hạng D9. */
  floorTiles: number;
  /** Khách/ô sàn nếu muốn đo theo mật độ (không bắt buộc; mặc định dùng hằng nội bộ PROVISIONAL). */
  customersPerSquareEcologic?: number;
  /** Số xe ước lượng vào bãi mỗi ngày (chỉ dùng cho parking_lot). */
  vehiclesPerDay?: number;
  /** Giá phí/ô tô (chỉ dùng cho parking_lot; mặc định PROVISIONAL). */
  feePerVehicle?: number;
}

/** Kết quả ước lượng cân bằng của một tòa (provisional). */
export interface BuildingBalanceEstimate {
  typeId: BuildingTypeId;
  /** Khoảng khách QUẦY mỗi ngày [min, max]; bãi xe = [0, 0] vì không có quầy bán. */
  expectedCustomersPerDayRange: [number, number];
  /** Phần trăm chi tiêu bình quân của khách so với mức nền (> 0 cho loại có quầy). */
  spendPerCustomerPercent: number;
  /** Các khung giờ cao điểm (giờ mở cửa 0–23). */
  peakHours: Array<[number, number]>;
  /** Doanh thu bãi xe mỗi ngày (chỉ > 0 cho parking_lot). */
  parkingRevenuePerDay?: number;
  /** Ghi chú provisional. */
  note: string;
}

/**
 * Ranh giới ô sàn và hệ số nhịp khách hạng D9.
 * Hạng suy từ số ô sàn, không phải chọn riêng:
 *   Tiệm tạp hóa  <60   ×1,0 | Tiện lợi 60–99 ×1,15 | Mini 100–159 ×1,3
 *   Siêu thị     160–239 ×1,5 | Đại siêu thị ≥240  ×1,7
 * Đơn điệu không giảm — tòa to hơn thì khách không ít hơn.
 */
export const D9_TIER_BOUNDARIES = [60, 100, 160, 240] as const;
export const D9_TIER_MULTIPLIERS = [1.0, 1.15, 1.3, 1.5, 1.7] as const;

/** Hệ số nhịp khách theo hạng D9 cho một số ô sàn (đơn điệu không giảm). */
export function tierMultiplier(floorTiles: number): number {
  if (!Number.isFinite(floorTiles) || floorTiles < 0) return D9_TIER_MULTIPLIERS[0];
  let tier = 0;
  for (const boundary of D9_TIER_BOUNDARIES) {
    if (floorTiles < boundary) break;
    tier++;
  }
  return D9_TIER_MULTIPLIERS[Math.min(tier, D9_TIER_MULTIPLIERS.length - 1)];
}

/** Tên hạng D9 theo ô sàn (chỉ để in/ghi chú). */
export function d9TierName(floorTiles: number): string {
  if (floorTiles < 60) return 'Tiệm tạp hóa';
  if (floorTiles < 100) return 'Cửa hàng tiện lợi';
  if (floorTiles < 160) return 'Siêu thị mini';
  if (floorTiles < 240) return 'Siêu thị';
  return 'Đại siêu thị';
}

const PEAK_HOURS: Record<BuildingTypeId, Array<[number, number]>> = {
  grocery_branch: [[7, 9], [17, 19]], // cửa hàng chung ngày
  cafe: [[6, 10]],                    // cao điểm sáng D4
  com_restaurant: [[11, 13], [17, 20]], // giờ cơm trưa & tối D4
  parking_lot: [[7, 9], [11, 13], [17, 19]], // giờ xe ra vào (không có khách quầy)
};

/** Khách quầy cơ bản/ngày (provisional, trước nhân hạng D9). Bãi xe = 0 vì không có quầy. */
const BASE_COUNTER_CUSTOMERS: Record<BuildingTypeId, number> = {
  grocery_branch: 120,
  cafe: 90,
  com_restaurant: 140,
  parking_lot: 0,
};

/** Phần trăm chi tiêu bình quân khách/khung so với mức nền của tiệm chính (provisional, > 0 cho loại có quầy). */
const SPEND_PERCENT: Record<BuildingTypeId, number> = {
  grocery_branch: 55,
  cafe: 38,
  com_restaurant: 85,
  parking_lot: 0, // không có khách quầy; doanh thu ở parkingRevenueFromVehicles
};

/** Giá phí bãi xe mặc định (provisional, ₫/ô tô/ngày). */
const DEFAULT_FEE_PER_VEHICLE = 15_000;

/**
 * Doanh thu bãi xe mỗi ngày: số xe × phí. Luôn ≥ 0; chỉ đưa vào ước lượng khi tòa là bãi xe.
 */
export function parkingRevenueFromVehicles(vehiclesPerDay: number, feePerVehicle: number): number {
  const v = Number.isFinite(vehiclesPerDay) && vehiclesPerDay > 0 ? vehiclesPerDay : 0;
  const f = Number.isFinite(feePerVehicle) && feePerVehicle > 0 ? feePerVehicle : 0;
  return v * f;
}

/**
 * Ước lượng cân bằng PROVISIONAL cho một tòa (D4 + D9).
 * Trả khoảng khách quầy [min, max] quanh mức cơ sở × hệ số hạng; bãi xe trả [0, 0]
 * nhưng kèm parkingRevenuePerDay > 0 khi có xe.
 */
export function estimateBuildingBalance(config: BuildingBalanceConfig): BuildingBalanceEstimate {
  const { typeId, floorTiles } = config;
  const mult = tierMultiplier(floorTiles);
  const tier = d9TierName(floorTiles);
  const peakHours = PEAK_HOURS[typeId];

  if (typeId === 'parking_lot') {
    const vehiclesPerDay = config.vehiclesPerDay ?? 0;
    const feePerVehicle = config.feePerVehicle ?? DEFAULT_FEE_PER_VEHICLE;
    const revenue = parkingRevenueFromVehicles(vehiclesPerDay, feePerVehicle);
    return {
      typeId,
      expectedCustomersPerDayRange: [0, 0],
      spendPerCustomerPercent: SPEND_PERCENT[typeId],
      peakHours,
      parkingRevenuePerDay: revenue,
      note: `Bãi giữ xe (D4): không có quầy bán (khách quầy = 0); thu phí theo xe ${feePerVehicle} ₫/xe · ${vehiclesPerDay} xe/ngày = ${revenue} ₫/ngày. Tòa trong bán kính 12 ô nhận +15% khách đi xe (arrival-mode). Hạng ${tier} (${floorTiles} ô sàn) không ảnh hưởng quầy.`,
    };
  }

  // Loại có quầy bán: khách cơ sở × hệ số hạng D9 (đơn điệu không giảm).
  const base = BASE_COUNTER_CUSTOMERS[typeId];
  const ecologic = config.customersPerSquareEcologic;
  const densityAdjusted = Number.isFinite(ecologic) && (ecologic ?? 0) > 0
    ? ecologic! * floorTiles
    : base;
  const center = densityAdjusted * mult;
  const spread = Math.max(1, Math.round(center * 0.2));
  const lo = Math.max(0, Math.round(center - spread));
  const hi = Math.round(center + spread);
  const peakText = peakHours.map(([a, b]) => `${a}–${b}h`).join(', ');

  return {
    typeId,
    expectedCustomersPerDayRange: [lo, hi],
    spendPerCustomerPercent: SPEND_PERCENT[typeId],
    peakHours,
    note: `Loại ${typeId} (D4): khách quầy ≈ ${Math.round(center)}/ngày (khung ${peakText}). Hạng ${tier} ×${mult} nhịp khách (D9, ${floorTiles} ô sàn). Chi tiêu khách ≈ ${SPEND_PERCENT[typeId]}% mức nền.`,
  };
}
