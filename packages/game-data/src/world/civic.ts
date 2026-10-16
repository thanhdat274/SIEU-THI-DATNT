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
/** Giá/duy trì: bộ E chốt 16/10/2026 (sweep `economy-civic-pop-sweep.ts`, hoàn vốn ~20 ngày cấp 15, ~50 ngày cấp 25). PROVISIONAL tới playtest. */
export const CIVIC_DEFS: CivicDef[] = [
  {
    buildingTypeId: 'park',
    service: 'green',
    qolPoints: 8,
    radiusTiles: 12,
    buildCost: 2_500_000,
    upkeepPerDay: 10_000,
  },
  {
    buildingTypeId: 'clinic',
    service: 'health',
    qolPoints: 12,
    radiusTiles: 16,
    buildCost: 4_000_000,
    upkeepPerDay: 15_000,
  },
  {
    buildingTypeId: 'ward_police',
    service: 'safety',
    qolPoints: 8,
    radiusTiles: 16,
    buildCost: 1_800_000,
    upkeepPerDay: 12_500,
  },
  {
    buildingTypeId: 'primary_school',
    service: 'education',
    qolPoints: 10,
    radiusTiles: 16,
    buildCost: 3_000_000,
    upkeepPerDay: 20_000,
  },
];

/**
 * Phí vệ sinh/an ninh xóm mỗi ô lô SỞ HỮU mỗi ngày (₫/ô/ngày) — PROVISIONAL (OpenSpec `civic-local-fees`, D2).
 * Lô thuê đã trả `rent` nên KHÔNG thu phí này (chống thuế hai lần).
 * Số chốt sau sweep hoàn vốn (xem `tổng hợp.md` khối BƯỚC 3).
 */
export const OWNED_TILE_FEE = 20;

/** Giảm giá phí xóm tối đa theo chỉ số sống khu: QoL 100 → ×0,7 (D2). */
export const CIVIC_FEE_QOL_DISCOUNT = 0.3;

/**
 * Phí xóm một ngày cho MỘT lô sở hữu (D2):
 * `OWNED_TILE_FEE × số ô × (1 − CIVIC_FEE_QOL_DISCOUNT × qol/100)`, làm tròn 100 ₫.
 * Làm tròn 100 ₫ (không phải nghìn): phí mỗi lô chỉ ~1–3 nghìn nên làm tròn nghìn xóa mất phần giảm theo QoL.
 * Làm tròn ở đây (từng lô) để tổng nhiều lô tất định và không phụ thuộc thứ tự cộng.
 */
export function civicFeeForOwnedParcel(tileCount: number, qol: number): number {
  const tiles = Number.isFinite(tileCount) ? Math.max(0, Math.floor(tileCount)) : 0;
  const q = Number.isFinite(qol) ? Math.min(100, Math.max(0, qol)) : 0;
  const raw = OWNED_TILE_FEE * tiles * (1 - CIVIC_FEE_QOL_DISCOUNT * q / 100);
  return Math.max(0, Math.round(raw / 100) * 100);
}

/** Tra cứu CivicDef theo buildingTypeId. */
export function civicDefOf(typeId: string): CivicDef | undefined {
  return CIVIC_DEFS.find((c) => c.buildingTypeId === typeId);
}

/**
 * Kiểm tra toàn vẹn định nghĩa công trình công cộng:
 * - Không trùng id
 * - qolPoints, radiusTiles, buildCost > 0 (nguyên); upkeepPerDay ≥ 0 (nguyên)
 * - `OWNED_TILE_FEE` > 0 (nguyên), `CIVIC_FEE_QOL_DISCOUNT` trong [0, 1]
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
    if (!Number.isSafeInteger(def.buildCost) || def.buildCost <= 0) errors.push(`${def.buildingTypeId}: buildCost phải là số nguyên > 0`);
    if (!Number.isSafeInteger(def.upkeepPerDay) || def.upkeepPerDay < 0) errors.push(`${def.buildingTypeId}: upkeepPerDay phải là số nguyên ≥ 0`);
  }

  // Phí xóm (OpenSpec `civic-local-fees` 1.1): hằng số dương, nguyên; hệ số giảm trong [0, 1].
  if (!Number.isSafeInteger(OWNED_TILE_FEE) || OWNED_TILE_FEE <= 0) errors.push('OWNED_TILE_FEE phải là số nguyên > 0');
  if (!Number.isFinite(CIVIC_FEE_QOL_DISCOUNT) || CIVIC_FEE_QOL_DISCOUNT < 0 || CIVIC_FEE_QOL_DISCOUNT > 1) {
    errors.push('CIVIC_FEE_QOL_DISCOUNT phải trong [0, 1]');
  }

  for (const expected of expectedTypes) {
    if (!foundTypes.has(expected)) {
      errors.push(`Thiếu loại công trình: ${expected}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
