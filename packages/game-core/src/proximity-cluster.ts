/**
 * Cụm theo khoảng cách (D2b — open-world-districts-city-goals 6d, task 1.5, phần THUẦN / PROVISIONAL).
 *
 * Thay `FOOD_CLUSTER_TRAFFIC_MULTIPLIER` (chỉ đếm số tòa phụ đang mở, không quan tâm vị trí)
 * bằng **cụm theo khoảng cách**: mỗi cặp tòa có quan hệ bổ trợ trong dữ liệu (tạp hóa ↔ quán ăn,
 * cà phê ↔ văn phòng/chi nhánh, bãi giữ xe ↔ mọi tòa), tòa nhận hệ số `1 + Σ bonus_cặp` với các
 * tòa bổ trợ trong bán kính 16 ô (cửa tới cửa), trần ×1,3 (provisional). Đây là lý do để người
 * chơi đặt các tòa thành **cụm** thay vì rải rác (cụm > rải rác, xem test).
 *
 * GHÉP CHÚ (THUẦN + PROVISIONAL): thay `foodClusterMultiplier` thật trong `customers.ts`
 * (đụng file có sẵn) là SAU (chờ máy thật). File này CHỈ chứa kiểu + hằng + hàm thuần,
 * KHÔNG phụ thuộc `@game/data` (tự định type) để chạy độc lập trong sandbox.
 *
 * CÁC HẰNG SỐ local PROVISIONAL theo đúng thiết kế D2b. CHỌN `PROXIMITY_CLUSTER_PAIR_BONUS`
 * sao cho ở bố trí mặc định W0 (2 tòa tạp hóa gần nhau) hệ số mới ≈ hệ số cụm cũ:
 *   - `clusterMultiplierFor` (2 tòa tạp hóa gần nhau, 1 cặp bổ trợ trong bán kính) = 1 + 0.10 = 1.10
 *   - `legacyFoodClusterMultiplier(1)`  = min(1 + 0.1×1, 1.5) = 1.10
 *   ⇒ chênh 0 → kinh tế save cũ không đổi (kiểm bằng test W0 dưới đây).
 * Khi nối thật nên dùng `@game/data` làm nguồn hằng duy nhất.
 */

/** Mã loại tòa nhà (từng loại tòa có thể có quan hệ bổ trợ trong dữ liệu). */
export type BuildingKind = 'grocery' | 'food' | 'cafe' | 'office' | 'branch' | 'parking';

/** Một tòa nhà với vị trí CỬA (ô — cửa tới cửa) để tính khoảng cách Manhattan. */
export interface ClusterBuilding {
  /** Id định danh tòa (duy nhất trong một bố trí). */
  id: string;
  /** Mã loại tòa (grocery/food/cafe/office/branch/parking). */
  kind: BuildingKind;
  /** Cột cửa (ô). */
  x: number;
  /** Hàng cửa (ô). */
  y: number;
}

/** Bán kính bổ trợ theo khoảng cách Manhattan (ô, cửa tới cửa). */
export const PROXIMITY_RADIUS = 16;

/** Trần hệ số cụm (×1,3 — provisional D2b). */
export const PROXIMITY_CLUSTER_CAP = 1.3;

/**
 * Thưởng mỗi CẶP bổ trợ trong bán kính (provisional D2b).
 * CHỌN = 0.10 để ở bố trí mặc định W0 (2 tòa tạp hóa gần nhau) hệ số mới = legacy cũ (1.10),
 * không đổi kinh tế save cũ. (Đề xuất 0.15/cặp cũng hợp lệ; 0.10 làm W0 khớp chính xác.)
 */
export const PROXIMITY_CLUSTER_PAIR_BONUS = 0.10;

/**
 * Quan hệ bổ trợ LẪN NHAU giữa các loại (provisional D2b):
 *   - tạp hóa (grocery) ↔ quán ăn (food)
 *   - cà phê (cafe) ↔ văn phòng (office) / chi nhánh (branch)
 *   - bãi giữ xe (parking) ↔ MỌI loại (kể cả parking khác)
 * Bảng đối xứng (nếu a↔b thì b↔a); `proximityBonusPair` kiểm không phụ thuộc thứ tự.
 */
export const CLUSTER_COMPAT: Record<BuildingKind, readonly BuildingKind[]> = {
  grocery: ['food'],
  food: ['grocery'],
  cafe: ['office', 'branch'],
  office: ['cafe'],
  branch: ['cafe'],
  parking: ['grocery', 'food', 'cafe', 'office', 'branch', 'parking'],
};

/** Hai loại tòa có bổ trợ lẫn nhau không (không phụ thuộc thứ tự). */
export function kindsCompatible(a: BuildingKind, b: BuildingKind): boolean {
  return (CLUSTER_COMPAT[a] as readonly BuildingKind[]).includes(b);
}

/**
 * Thưởng của một cặp tòa: `PROXIMITY_CLUSTER_PAIR_BONUS` nếu hai loại bổ trợ lẫn nhau
 * và là hai tòa khác nhau (cùng id = 0); ngược lại 0.
 */
export function proximityBonusPair(a: ClusterBuilding, b: ClusterBuilding): number {
  if (a.id === b.id) return 0;
  if (!kindsCompatible(a.kind, b.kind)) return 0;
  return PROXIMITY_CLUSTER_PAIR_BONUS;
}

/** Khoảng cách Manhattan từ cửa tới cửa ≤ `PROXIMITY_RADIUS`. */
export function withinRadius(a: ClusterBuilding, b: ClusterBuilding): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= PROXIMITY_RADIUS;
}

/** Kẹp giá trị vào [lo, hi]. */
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Hệ số cụm cho một tòa theo D2b:
 *   `clamp(1 + Σ bonus_cặp (chỉ cặp bổ trợ & trong bán kính), 1, PROXIMITY_CLUSTER_CAP)`.
 * ĐƠN ĐIỆU: thêm tòa bổ trợ trong bán kính chỉ tăng (hoặc giữ) hệ số; tòa ngoài bán kính
 * hay không bổ trợ không tăng (bonus 0). Tự xét `target` khỏi chính nó.
 */
export function clusterMultiplierFor(target: ClusterBuilding, allBuildings: readonly ClusterBuilding[]): number {
  let sum = 0;
  for (const other of allBuildings) {
    if (other.id === target.id) continue;
    if (proximityBonusPair(target, other) === 0) continue;
    if (!withinRadius(target, other)) continue;
    sum += PROXIMITY_CLUSTER_PAIR_BONUS;
  }
  return clamp(1 + sum, 1, PROXIMITY_CLUSTER_CAP);
}

/**
 * Bản triển khai cụm CŨ (đếm số tòa mở, không quan tâm vị trí) để ĐỐI CHIẾU "W0 mặc định = giá trị cũ".
 * Khớp chuẩn cũ `FOOD_CLUSTER_TRAFFIC_MULTIPLIER` (đếm tòa mở): `min(1 + 0.1×count, 1.5)`.
 * Khi nối thật nên thay bằng `@game/data` `foodClusterMultiplier`.
 */
export function legacyFoodClusterMultiplier(openFoodBuildingsCount: number): number {
  const count = Math.max(0, Math.floor(openFoodBuildingsCount));
  return Math.min(1 + 0.1 * count, 1.5);
}
