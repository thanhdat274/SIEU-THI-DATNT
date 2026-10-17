/**
 * Mục tiêu xóm phố — Civic Reveal Goals (OpenSpec `civic-city-goals`, Giai đoạn 3, tasks 1.1–1.3).
 *
 * Các mục tiêu này là KHUYẾN KHÍCH RIÊNG (bonus): nhận một mục tiêu xóm phố làm *hiện* trang sổ góp
 * (`revealBundleId`) một công trình công cộng. Chúng KHÔNG nằm trong `CITY_GOALS_CATALOG` (catalog core
 * vẫn điều khiển lên cấp thành phố) nên KHÔNG chặn luật lên cấp và không phá mô phỏng tiến độ thuần.
 * Điều này giữ đúng "mỗi cấp tối đa 1 mục tiêu xóm phố" (design D1) mà không bắt người chơi chỉ thích
 * kinh doanh phải xây công trình công cộng mới lên cấp.
 *
 * Loại điều kiện (task 1.1): `civic_building_count` (đếm công trình công cộng theo loại),
 * `district_qol_at_least` (chỉ số sống của một khu), `total_population_at_least` (tổng dân số xóm).
 * Đánh giá thuần bằng `evaluateCivicGoalCondition` trong `./civic-bundles`.
 *
 * Không hồi tố (task 1.3): khi tải save ở cấp đã qua, các trang sổ của mục tiêu xóm phố cấp thấp hơn
 * hiện NGAY (xem `revealedBundleIdsForLoadedLevel`), không làm mất cấp.
 */
import { CIVIC_BUNDLES, civicBundleById } from '@game/data';
import type { CivicGoalCondition } from './civic-bundles';

/** Định nghĩa một mục tiêu xóm phố (bonus): điều kiện + trang sổ được hiện. */
export interface CivicRevealGoal {
  /** Định danh duy nhất. */
  id: string;
  /** Cấp thành phố mà mục tiêu thuộc về (khớp `revealedByCityLevel` của sổ). */
  cityLevel: number;
  /** Điều kiện cần đạt để nhận (do `evaluateCivicGoalCondition` đánh giá). */
  condition: CivicGoalCondition;
  /** Trang sổ góp được hiện khi nhận mục tiêu này. */
  revealBundleId: string;
}

/**
 * Danh mục mục tiêu xóm phố — 1 mục tiêu / cấp, mỗi mục tiêu hiện đúng 1 trang sổ (bundle).
 * Cấp khớp `revealedByCityLevel` của từng sổ (park 4, clinic 5, ward_police 7, primary_school 9).
 * Giá trị `condition` là PROVISIONAL cân bằng (có thể điều chỉnh sau playtest) — nhưng id và liên kết
 * bundle là ràng buộc chính (validate).
 */
export const CIVIC_REVEAL_GOALS: readonly CivicRevealGoal[] = [
  {
    id: 'crg_l4_park',
    cityLevel: 4,
    condition: { kind: 'total_population_at_least', targetValue: 100 },
    revealBundleId: 'bundle_park',
  },
  {
    id: 'crg_l5_clinic',
    cityLevel: 5,
    condition: { kind: 'district_qol_at_least', districtId: 'hem_dan_cu', targetValue: 40 },
    revealBundleId: 'bundle_clinic',
  },
  {
    id: 'crg_l7_ward_police',
    cityLevel: 7,
    condition: { kind: 'civic_building_count', buildingTypeId: 'park', targetValue: 1 },
    revealBundleId: 'bundle_ward_police',
  },
  {
    id: 'crg_l9_primary_school',
    cityLevel: 9,
    condition: { kind: 'total_population_at_least', targetValue: 250 },
    revealBundleId: 'bundle_primary_school',
  },
];

/** Tra một mục tiêu xóm phố theo id. */
export function civicRevealGoalById(id: string): CivicRevealGoal | undefined {
  return CIVIC_REVEAL_GOALS.find((g) => g.id === id);
}

/** Mọi mục tiêu xóm phố thuộc một cấp thành phố. */
export function civicRevealGoalsForLevel(level: number): CivicRevealGoal[] {
  return CIVIC_REVEAL_GOALS.filter((g) => g.cityLevel === level);
}

/**
 * Validate danh mục mục tiêu xóm phố (task 1.2 "validate catalog"):
 *  - id duy nhất;
 *  - `revealBundleId` phải là một trang sổ có thật trong `CIVIC_BUNDLES`;
 *  - `cityLevel` phải khớp `revealedByCityLevel` của sổ đó;
 *  - mỗi cấp tối đa 1 mục tiêu xóm phố (design D1).
 */
export function validateCivicRevealGoals(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenLevels = new Set<number>();
  for (const g of CIVIC_REVEAL_GOALS) {
    if (seenIds.has(g.id)) errors.push(`Trùng id mục tiêu xóm phố: ${g.id}`);
    seenIds.add(g.id);

    const bundle = civicBundleById(g.revealBundleId);
    if (!bundle) {
      errors.push(`${g.id}: revealBundleId '${g.revealBundleId}' không có trong CIVIC_BUNDLES`);
      continue;
    }
    if (bundle.revealedByCityLevel !== g.cityLevel) {
      errors.push(`${g.id}: cityLevel ${g.cityLevel} phải khớp revealedByCityLevel ${bundle.revealedByCityLevel} của sổ ${bundle.id}`);
    }
    if (seenLevels.has(g.cityLevel)) {
      errors.push(`${g.id}: mỗi cấp chỉ tối đa 1 mục tiêu xóm phố (trùng cấp ${g.cityLevel})`);
    }
    seenLevels.add(g.cityLevel);

    if (!g.condition || typeof g.condition.targetValue !== 'number' || g.condition.targetValue < 0) {
      errors.push(`${g.id}: condition.targetValue phải là số ≥ 0`);
    }
    if (g.condition.kind === 'civic_building_count' && !g.condition.buildingTypeId) {
      errors.push(`${g.id}: civic_building_count cần buildingTypeId`);
    }
    if (g.condition.kind === 'district_qol_at_least' && !g.condition.districtId) {
      errors.push(`${g.id}: district_qol_at_least cần districtId`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Quyết định một trang sổ đã được "hiện" chưa. Một sổ hiện nếu EITHER:
 *  - nó nằm trong `revealedBundleIds` (đã nhận mục tiêu xóm phố của nó); HOẶC
 *  - `cityLevel >= revealedByCityLevel` (quy tắc cũ theo cấp, giữ tương thích save/điều kiện mở sổ).
 * Return `true` nếu sổ đã hiện.
 */
export function isBundleRevealed(
  bundleId: string,
  cityLevel: number,
  revealedBundleIds: readonly string[] | undefined,
): boolean {
  const bundle = civicBundleById(bundleId);
  if (revealedBundleIds?.includes(bundleId)) return true;
  if (bundle && cityLevel >= bundle.revealedByCityLevel) return true;
  return false;
}

/**
 * Không hồi tố (task 1.3): tính danh sách trang sổ cần "hiện ngay" khi tải save ở một cấp đã qua.
 * Tất cả mục tiêu xóm phố có cấp ≤ `loadedLevel` đều tự hiện (người chơi đã qua các cấp đó).
 * Trả về mảng `revealBundleId` không trùng.
 */
export function revealedBundleIdsForLoadedLevel(loadedLevel: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const g of CIVIC_REVEAL_GOALS) {
    if (g.cityLevel <= loadedLevel && !seen.has(g.revealBundleId)) {
      seen.add(g.revealBundleId);
      result.push(g.revealBundleId);
    }
  }
  return result;
}

/** Tổng số trang sổ trong hệ thống (để test/UI). */
export function totalCivicBundles(): number {
  return CIVIC_BUNDLES.length;
}
