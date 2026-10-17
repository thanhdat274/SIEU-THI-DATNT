/**
 * Tính chỉ số sống (QoL) theo khu từ công trình công cộng (OpenSpec `civic-buildings-qol`, D2).
 *
 * THUẦN: không Math.random, không phụ thuộc thời gian thực. Trả bản sao mỗi lần gọi.
 *
 * Công thức D2:
 *   - Mỗi khu có tâm = trọng tâm các lô của khu.
 *   - Với mỗi công trình c: `contrib(c) = qolPoints × max(0, 1 − dist/radius)`.
 *     distance = Manhattan từ CỬA tòa (entranceTile) đến tâm khu (tâm ngang các lô, trên hàng vỉa hè mặt tiền).
 *   - Theo service: cộng các contrib, công trình thứ 2 cùng service × 0.5, thứ 3+ × 0.
 *   - Điểm service bị trần ở `maxQolPoints` (qolPoints lớn nhất của service đó).
 *   - `civicQol = clamp(BASE_QOL(20) + Σ service, 0, 100)`.
 *
 * Vị trí cửa: dùng template `entranceTile` của tòa + placement origin,
 * không giả định kích thước hay dùng tâm lô.
 *
 * D4: Không thêm trường save — QoL dẫn xuất từ placement + CIVIC_DEFS.
 */
import { CIVIC_DEFS, civicDefOf } from '@game/data';
import { type LandParcel } from '@game/data';
import { buildingTypeOfInstance } from '@game/data';

/** Một tòa đã đặt trong simulation (buildingPlacements). */
export interface PlacedBuildingPlacement {
  /** Id instance (vd 'park-1'). */
  buildingId: string;
  /** Id loại (vd 'park'), có thể undefined fallback suy từ buildingId. */
  typeId?: string;
  /** Cột gốc (tọa độ thế giới). */
  originX: number;
  /** Hàng gốc (tọa độ thế giới). */
  originY: number;
  /** Lô chứa. */
  parcelId?: string;
}

/** BASE_QOL khi không có công trình nào. */
export const BASE_QOL = 20;

/** QoL trần. */
export const MAX_QOL = 100;

/** Trùng service lần thứ 2 → hệ số 0.5 (chống spam). */
const SPAM_SECOND_MUL = 0.5;

/** Trùng service lần thứ 3+ → hệ số 0. */
const SPAM_N_PLUS_MUL = 0;

/**
 * Tâm một khu: x = trung bình tâm ngang các lô, y = trung bình hàng vỉa hè trước mặt tiền (`rect.y1 + 1`).
 * Cửa tòa luôn nằm ở hàng vỉa hè, nên đo tâm theo hàng này; lấy tâm dọc của lô (lô W0 kéo dài lên phía bắc tới y=-3)
 * làm mọi công trình trong khu đều nằm ngoài bán kính.
 */
function districtCentroid(parcels: readonly LandParcel[]): { x: number; y: number } {
  let cx = 0, cy = 0;
  for (const p of parcels) {
    cx += (p.rect.x0 + p.rect.x1) / 2;
    cy += p.rect.y1 + 1;
  }
  const n = parcels.length;
  return n > 0 ? { x: cx / n, y: cy / n } : { x: 0, y: 0 };
}

/** Khoảng cách Manhattan giữa hai điểm ô. */
function manhattanDist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Kẹp giá trị vào [lo, hi]. */
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Lấy vị trí CỬA (entrance tile) của một building placement.
 * Dùng template entranceTile + placement origin.
 */
function getDoorPosition(placement: PlacedBuildingPlacement): { x: number; y: number } {
  const typeDef = buildingTypeOfInstance(placement.buildingId);
  // entranceTile là tương đối với gốc tòa (cùng cách tính với placementGeometry).
  if (typeDef?.template) return { x: placement.originX + typeDef.template.entranceTile.x, y: placement.originY + typeDef.template.entranceTile.y };
  return { x: placement.originX, y: placement.originY };
}

/**
 * Tính chỉ số sống theo khu từ danh sách công trình đã đặt.
 *
 * @param placements — danh sách buildingPlacements loại civic.
 * @param parcels — toàn bộ lô (để suy ra districtId của mỗi lô).
 * @returns bản ghi `districtId → civicQol ∈ [0, 100]`.
 */
export function computeCivicQol(
  placements: readonly PlacedBuildingPlacement[],
  parcels: readonly LandParcel[],
): Record<string, number> {
  // 1. Nhóm lô theo districtId
  const parcelsByDistrict = new Map<string, LandParcel[]>();
  for (const p of parcels) {
    const list = parcelsByDistrict.get(p.districtId) ?? [];
    list.push(p);
    parcelsByDistrict.set(p.districtId, list);
  }

  // 2. Tâm mỗi khu
  const centroids = new Map<string, { x: number; y: number }>();
  for (const [districtId, districtParcels] of parcelsByDistrict) {
    centroids.set(districtId, districtCentroid(districtParcels));
  }

  // 3. Lọc placement civic + tính vị trí cửa thật
  const civicBuildings: { typeId: string; doorX: number; doorY: number }[] = [];
  for (const p of placements) {
    const typeId = p.typeId ?? buildingTypeOfInstance(p.buildingId)?.typeId;
    if (!typeId) continue;
    const def = civicDefOf(typeId);
    if (!def) continue;
    const door = getDoorPosition({ ...p, typeId });
    civicBuildings.push({ typeId, doorX: door.x, doorY: door.y });
  }

  // 4. Tính QoL cho từng khu
  const result: Record<string, number> = {};
  for (const [districtId] of centroids) {
    const centroid = centroids.get(districtId)!;
    // Nhóm building theo service
    const contribByService = new Map<string, number[]>();

    for (const building of civicBuildings) {
      const def = civicDefOf(building.typeId);
      if (!def) continue;

      const dist = manhattanDist(centroid, { x: building.doorX, y: building.doorY });
      const contrib = def.qolPoints * Math.max(0, 1 - dist / def.radiusTiles);

      const existing = contribByService.get(def.service) ?? [];
      existing.push(contrib);
      contribByService.set(def.service, existing);
    }

    // 5. Tổng service QoL, áp spam reduction + trần per-service
    let serviceSum = 0;
    for (const [service, contribs] of contribByService) {
      contribs.sort((a, b) => b - a); // sắp giảm dần

      let spamContrib = 0;
      for (let i = 0; i < contribs.length; i++) {
        const mul = i === 0 ? 1 : i === 1 ? SPAM_SECOND_MUL : SPAM_N_PLUS_MUL;
        spamContrib += contribs[i] * mul;
      }

      // Trần per-service: max qolPoints của service
      const maxQol = Math.max(...CIVIC_DEFS.filter(c => c.service === service).map(c => c.qolPoints), 1);
      serviceSum += Math.min(spamContrib, maxQol);
    }

    result[districtId] = clamp(BASE_QOL + serviceSum, 0, MAX_QOL);
  }

  return result;
}

/**
 * Tính QoL cho một khu cụ thể.
 * @returns QoL trong [0, 100], hoặc BASE_QOL nếu khu không tồn tại.
 */
export function civicQolForDistrict(
  districtId: string,
  placements: readonly PlacedBuildingPlacement[],
  parcels: readonly LandParcel[],
): number {
  const all = computeCivicQol(placements, parcels);
  return all[districtId] ?? BASE_QOL;
}
