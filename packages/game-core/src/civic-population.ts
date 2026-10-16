/**
 * Dân số xóm theo chỉ số sống (OpenSpec `civic-population-demand`, D1–D3).
 *
 * THUẦN, tất định, chỉ số nguyên cho dân số.
 *
 * D1. Sức chứa: capacity = Σ ô các lô của khu thuộc ĐỢT ĐÃ MỞ × RESIDENTS_PER_TILE (W0 luôn mở).
 *     PROVISIONAL: chưa có dữ liệu "lô nhà dân", dùng diện tích lô làm đại diện.
 * D2. Mục tiêu: target = round(capacity × (0.6 + 0.6 × qol/100)); baseline = target ở QoL cơ bản (20).
 * D3. Mỗi ngày dân số tiến về target, bước tối đa 3% dân số hiện tại (ít nhất 1 người để không kẹt vì làm tròn).
 * Hệ số khách: clamp(pop / baseline, 0.85, 1.25). Dân số = baseline ⇒ hệ số đúng 1.
 */

import type { LandParcel } from '@game/data';
import { DISTRICTS } from '@game/data';
import { BASE_QOL } from './civic-qol';

/** Số cư dân mỗi ô đất đã khai hoang (PROVISIONAL). */
export const RESIDENTS_PER_TILE = 0.5;

/** Giới hạn dưới/trần hệ số lưu lượng. */
export const TRAFFIC_FACTOR_MIN = 0.85;
export const TRAFFIC_FACTOR_MAX = 1.25;

/** Tỷ lệ tăng/giảm dân số tối đa mỗi ngày. */
export const DAILY_CHANGE_RATE = 0.03;

/** Trạng thái dân số một khu. */
export interface DistrictPopulation {
  pop: number;
  target: number;
  baseline: number;
  factor: number;
  qol: number;
}

/** Sức chứa dân số của một khu: chỉ tính lô thuộc khu VÀ thuộc đợt đã mở. */
export function districtCapacity(districtId: string, parcels: readonly LandParcel[], openedWaves: readonly string[]): number {
  let tiles = 0;
  for (const p of parcels) {
    if (p.districtId !== districtId) continue;
    if (p.wave === 0 || openedWaves.includes(`w${p.wave}`)) tiles += (p.rect.x1 - p.rect.x0) * (p.rect.y1 - p.rect.y0);
  }
  return tiles * RESIDENTS_PER_TILE;
}

/** Dân số mục tiêu (số nguyên). */
export function targetPopulation(capacity: number, qol: number): number {
  return Math.round(capacity * (0.6 + 0.6 * qol / 100));
}

/** Dân số ở QoL cơ bản — mốc để hệ số khách = 1. */
export function baselinePop(capacity: number): number {
  return targetPopulation(capacity, BASE_QOL);
}

/** Một ngày: tiến về target, bước tối đa 3% dân số (ít nhất 1). Đầu vào hỏng/âm coi như 0. */
export function stepPopulation(current: number, target: number): number {
  const cur = Number.isFinite(current) && current > 0 ? Math.round(current) : 0;
  const goal = Math.max(0, Math.round(target));
  const delta = goal - cur;
  if (delta === 0) return cur;
  const maxChange = Math.max(1, Math.round(DAILY_CHANGE_RATE * cur));
  return cur + Math.sign(delta) * Math.min(Math.abs(delta), maxChange);
}

/** Hệ số lưu lượng khách: clamp(pop / baseline, 0.85, 1.25); baseline 0 ⇒ 1. */
export function populationTrafficFactor(pop: number, baseline: number): number {
  if (baseline <= 0) return 1;
  return Math.min(TRAFFIC_FACTOR_MAX, Math.max(TRAFFIC_FACTOR_MIN, pop / baseline));
}

/**
 * Dân số đã lưu dùng được không. 0 hoặc thiếu ở khu có sức chứa = "chưa có dân" (khu vừa mở / save cũ) → khởi tạo baseline;
 * khu có sức chứa không bao giờ giảm về 0 thật vì target ≥ 0.6 × sức chứa.
 */
function storedPop(raw: number | undefined, baseline: number): number {
  if (raw === undefined || !Number.isFinite(raw) || raw < 0) return baseline;
  if (raw === 0 && baseline > 0) return baseline;
  return Math.round(raw);
}

/** Trạng thái dân số mọi khu từ QoL hiện tại, đợt đã mở và dân số đã lưu. */
export function computePopulationSnapshot(
  qolByDistrict: Readonly<Record<string, number>>,
  parcels: readonly LandParcel[],
  openedWaves: readonly string[],
  stored: Readonly<Record<string, number>> | undefined,
): Record<string, DistrictPopulation> {
  const snapshot: Record<string, DistrictPopulation> = {};
  for (const districtId of Object.keys(DISTRICTS)) {
    const capacity = districtCapacity(districtId, parcels, openedWaves);
    const qol = qolByDistrict[districtId] ?? BASE_QOL;
    const baseline = baselinePop(capacity);
    const pop = storedPop(stored?.[districtId], baseline);
    snapshot[districtId] = { pop, target: targetPopulation(capacity, qol), baseline, factor: populationTrafficFactor(pop, baseline), qol };
  }
  return snapshot;
}

/** Bước dân số một ngày cho mọi khu (target lấy từ snapshot vừa tính với QoL hiện tại). */
export function stepAllPopulations(snapshot: Readonly<Record<string, DistrictPopulation>>): Record<string, DistrictPopulation> {
  const next: Record<string, DistrictPopulation> = {};
  for (const [districtId, state] of Object.entries(snapshot)) {
    const pop = stepPopulation(state.pop, state.target);
    next[districtId] = { ...state, pop, factor: populationTrafficFactor(pop, state.baseline) };
  }
  return next;
}

/** Mỗi +1.0 hệ số dân số thêm bấy nhiêu chỗ khách đồng thời trong tiệm (hệ số 1.25 → +2, 0.85 → −1). */
export const POP_CAP_SLOTS_PER_FACTOR = 8;
/** Mỗi +1.0 hệ số dân số thêm bấy nhiêu xác suất khách lấy thêm 1 món cùng kệ; trần 10%. */
export const POP_EXTRA_UNIT_PER_FACTOR = 0.4;
export const POP_EXTRA_UNIT_MAX = 0.1;

/**
 * Chỗ khách đồng thời cộng thêm theo dân số. Đo thực tế: tiệm chạm trần đồng thời ~80% thời gian mở cửa ở mọi cấp,
 * nên chỉ tăng lưu lượng không ra thêm khách; dân số phải nới đúng trần này.
 */
export function populationCapBonus(factor: number): number {
  return Number.isFinite(factor) ? Math.round((factor - 1) * POP_CAP_SLOTS_PER_FACTOR) : 0;
}

/** Xác suất khách lấy thêm 1 món ở kệ đang đứng (xóm đông mua nhiều hơn); hệ số ≤ 1 ⇒ 0. */
export function populationExtraUnitChance(factor: number): number {
  if (!Number.isFinite(factor) || factor <= 1) return 0;
  return Math.min(POP_EXTRA_UNIT_MAX, (factor - 1) * POP_EXTRA_UNIT_PER_FACTOR);
}
