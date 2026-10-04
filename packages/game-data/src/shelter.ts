import { AWNING_SPANS, DRINK_BOUNDS, MAIN_STORE_BOUNDS, WAREHOUSE_BOUNDS_FOR_SHELTER, XOI_BOUNDS, type AwningId } from './buildings';

/**
 * Khu vực trú mưa (px). 'building' là bên trong công trình (không mưa, cởi áo mưa); 'awning' là dải vỉa hè dưới mái hiên
 * (đóng ô nhưng có thể giữ áo mưa). Đơn giản có chủ đích: hình chữ nhật, không cần tìm đường — NPC vỉa hè chỉ đi dọc
 * vỉa hè tới mép gần nhất của khu vực.
 */
export interface ShelterZone {
  id: string;
  kind: 'building' | 'awning';
  /** Mái hiên thuộc tòa nào; chỉ tính khi tòa đã mở (xem `setAwningOpen`). */
  awning?: AwningId;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Số lớn hơn được ưu tiên khi hai khu vực cách đều. */
  priority: number;
}

const T = 32;
const rect = (b: { left: number; right: number; top: number; bottom: number }) => ({ x0: b.left * T, y0: b.top * T, x1: (b.right + 1) * T, y1: (b.bottom + 1) * T });

export const SHELTER_ZONES: readonly ShelterZone[] = [
  { id: 'store-inside', kind: 'building', ...rect(MAIN_STORE_BOUNDS), priority: 3 },
  { id: 'warehouse-inside', kind: 'building', ...rect(WAREHOUSE_BOUNDS_FOR_SHELTER), priority: 3 },
  { id: 'xoi-inside', kind: 'building', ...rect(XOI_BOUNDS), priority: 3 },
  { id: 'drink-inside', kind: 'building', ...rect(DRINK_BOUNDS), priority: 3 },
  // Mái hiên: dải vỉa hè ngay dưới mái (đủ sâu để chứa làn đi bộ y ≈ 371–390).
  { id: 'store-awning', kind: 'awning', awning: 'main', x0: AWNING_SPANS.main.x0, y0: 352, x1: AWNING_SPANS.main.x1, y1: 396, priority: 2 },
  { id: 'xoi-awning', kind: 'awning', awning: 'xoi', x0: AWNING_SPANS.xoi.x0, y0: 352, x1: AWNING_SPANS.xoi.x1, y1: 396, priority: 1 },
  { id: 'drink-awning', kind: 'awning', awning: 'drink', x0: AWNING_SPANS.drink.x0, y0: 352, x1: AWNING_SPANS.drink.x1, y1: 396, priority: 1 },
];

export const SHELTER_RULES = {
  /** Mưa (0..1) từ mức này NPC ngoài trời bắt đầu tìm chỗ trú; dưới `releaseRain` thì rời đi (trễ để không giật). */
  seekRain: 0.55,
  releaseRain: 0.35,
  /** Chỉ chạy tới khu vực trong tầm này (px) — không băng qua cả bản đồ. */
  maxDetourPx: 260,
  /** Sau mỗi lần cân nhắc (kể cả từ chối) phải chờ ngần này giây mới cân nhắc lại. */
  reevaluateCooldownSec: 8,
  /** Trú tối đa ngần này giây rồi đi tiếp dù còn mưa (tránh đứng mãi). */
  maxShelterSec: 90,
} as const;

/** Mái hiên tòa phụ chỉ có khi đã mua/mở (mặt tiền chưa mở không vẽ mái). Mô phỏng cập nhật mỗi nhịp; tiệm chính luôn có. */
const openAwnings = new Set<AwningId>(['main']);
export function setAwningOpen(id: AwningId, open: boolean): void {
  if (id === 'main') return;
  if (open) openAwnings.add(id); else openAwnings.delete(id);
}
export const isAwningOpen = (id: AwningId | undefined): boolean => id === undefined || openAwnings.has(id);
/** Khu trú còn hiệu lực (loại mái hiên của tòa chưa mở). */
export const activeShelterZones = (): readonly ShelterZone[] => SHELTER_ZONES.filter((z) => isAwningOpen(z.awning));

export function shelterZoneAt(x: number, y: number): ShelterZone | null {
  let best: ShelterZone | null = null;
  for (const z of SHELTER_ZONES) {
    if (!isAwningOpen(z.awning)) continue;
    if (x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1 && (!best || z.priority > best.priority)) best = z;
  }
  return best;
}

export function isUnderShelter(x: number, y: number): boolean {
  return shelterZoneAt(x, y) !== null;
}

/**
 * Khu vực 'awning' gần nhất theo trục x so với `x` trong tầm `maxDetourPx`; trả điểm x đích (mép trong khu vực, cách rìa 10 px)
 * hoặc null nếu không có. Nếu đã đứng trong khu vực thì đích là chính x.
 */
export function nearestAwningTargetX(x: number, maxDetourPx: number = SHELTER_RULES.maxDetourPx, slot = 0.5): { zone: ShelterZone; targetX: number } | null {
  let best: { zone: ShelterZone; targetX: number; d: number } | null = null;
  for (const z of SHELTER_ZONES) {
    if (z.kind !== 'awning' || !isAwningOpen(z.awning)) continue;
    const inner0 = z.x0 + 10;
    const inner1 = z.x1 - 10;
    // `slot` (0..1, ổn định theo từng người) rải điểm đứng để nhiều người không chồng lên cùng một điểm ảnh.
    let t = x + (slot - 0.5) * 48;
    if (t < inner0) t = inner0 + slot * 48;
    if (t > inner1) t = inner1 - slot * 48;
    const targetX = Math.max(inner0, Math.min(inner1, t));
    const d = Math.abs(targetX - x);
    if (d > maxDetourPx) continue;
    if (!best || d < best.d - 1 || (Math.abs(d - best.d) <= 1 && z.priority > best.zone.priority)) best = { zone: z, targetX, d };
  }
  return best ? { zone: best.zone, targetX: best.targetX } : null;
}

/**
 * Độ gần mái 0..1: 1 khi ở trong công trình hoặc dưới mái hiên đang mở, giảm tuyến tính tới 0 ở xa `reach` px
 * (khoảng cách tới hình chữ nhật khu trú gần nhất; không có âm thanh không gian).
 */
export function roofProximityAt(x: number, y: number, reach = 160): number {
  let best = reach;
  for (const z of SHELTER_ZONES) {
    if (!isAwningOpen(z.awning)) continue;
    const dx = Math.max(z.x0 - x, 0, x - z.x1);
    const dy = Math.max(z.y0 - y, 0, y - z.y1);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return Math.max(0, 1 - best / reach);
}
