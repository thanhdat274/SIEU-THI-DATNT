/**
 * Dữ liệu công trình công cộng (OpenSpec `civic-buildings-qol`, D1).
 *
 * Nguồn duy nhất: CIVIC_DEFS cho service/qolPoints/radius/buildCost/upkeepPerDay.
 * Cấp mở khóa (`unlockLevel`) lấy từ BUILDING_TYPE_DEFS[*].unlockLevel — một nguồn.
 */

/** Mã loại dịch vụ công cộng. */
export type CivicServiceId = 'green' | 'health' | 'safety' | 'education';

/** Định nghĩa một loại công trình công cộng (nguồn duy nhất cho service/qolPoints/radius/buildCost/upkeep). */
export interface CivicDef {
  /** Id loại công trình (park | clinic | ward_police | primary_school). */
  buildingTypeId: string;
  /** Loại dịch vụ. */
  service: CivicServiceId;
  /** Điểm QoL tối đa khi đặt ở trung tâm khu. */
  qolPoints: number;
  /** Bán kính ảnh hưởng (ô, cửa tới cửa). */
  radiusTiles: number;
  /** Giá xây (₫). */
  buildCost: number;
  /** Phí duy trì/ngày (₫) — dùng ở change `civic-local-fees`. */
  upkeepPerDay: number;
}

/**
 * Bảng công trình công cộng (PROVISIONAL — chỉnh sau sweep).
 *
 * Kích thước footprint (từ template):
 *   - park:          6×6
 *   - clinic:        6×8
 *   - ward_police:   6×8
 *   - primary_school: 8×8
 * Tất cả vừa ít nhất một lô W0.
 */
export const CIVIC_DEFS: CivicDef[] = [
  {
    buildingTypeId: 'park',
    service: 'green',
    qolPoints: 8,
    radiusTiles: 12,
    buildCost: 500_000,
    upkeepPerDay: 2_000,
  },
  {
    buildingTypeId: 'clinic',
    service: 'health',
    qolPoints: 12,
    radiusTiles: 16,
    buildCost: 800_000,
    upkeepPerDay: 3_000,
  },
  {
    buildingTypeId: 'ward_police',
    service: 'safety',
    qolPoints: 8,
    radiusTiles: 16,
    buildCost: 600_000,
    upkeepPerDay: 2_500,
  },
  {
    buildingTypeId: 'primary_school',
    service: 'education',
    qolPoints: 10,
    radiusTiles: 16,
    buildCost: 1_000_000,
    upkeepPerDay: 4_000,
  },
];

/** Tra cứu CivicDef theo buildingTypeId. */
export function civicDefOf(typeId: string): CivicDef | undefined {
  return CIVIC_DEFS.find((c) => c.buildingTypeId === typeId);
}

/**
 * Kiểm tra toàn vẹn định nghĩa công trình công cộng:
 * - Không trùng id
 * - qolPoints, radiusTiles, buildCost > 0; upkeepPerDay ≥ 0
 * - Đủ 4 loại (park, clinic, ward_police, primary_school)
 */
export function validateCivicDefs(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const expectedTypes = new Set(['park', 'clinic', 'ward_police', 'primary_school']);
  const foundTypes = new Set<string>();
  const seenIds = new Set<string>();

  for (const def of CIVIC_DEFS) {
    if (seenIds.has(def.buildingTypeId)) {
      errors.push(`Trùng id công trình: ${def.buildingTypeId}`);
    }
    seenIds.add(def.buildingTypeId);
    foundTypes.add(def.buildingTypeId);

    if (def.qolPoints <= 0) errors.push(`${def.buildingTypeId}: qolPoints phải > 0`);
    if (def.radiusTiles <= 0) errors.push(`${def.buildingTypeId}: radiusTiles phải > 0`);
    if (def.buildCost <= 0) errors.push(`${def.buildingTypeId}: buildCost phải > 0`);
    if (def.upkeepPerDay < 0) errors.push(`${def.buildingTypeId}: upkeepPerDay phải ≥ 0`);
  }

  for (const expected of expectedTypes) {
    if (!foundTypes.has(expected)) {
      errors.push(`Thiếu loại công trình: ${expected}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
