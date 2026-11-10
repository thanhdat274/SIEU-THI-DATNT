import { COOKED_PRODUCT_IDS } from './recipes';
import { NEIGHBOR_ONLY_IDS } from './homemade';
import { REGION_IDS } from './regionSpecialty';

/**
 * Hệ 3 (SPEC-CHIEU-SAU §3) — ĐỊNH VỊ TIỆM (Lát L1: CHỈ ĐO).
 * Từ cấp 60 chủ treo biển theo 1 trong 3 hướng; trước khi treo, thẻ Sổ đầu ngày "Tiệm đang nghiêng về
 * hướng nào" đo xem tiệm hiện khớp X/Y tiêu chí của từng hướng. L1 KHÔNG đổi kinh tế (mọi hiệu ứng chỉ
 * bật từ L3); chỉ là bề mặt đo đạc thuần để người chơi biết mình hợp hướng gì.
 *
 * Cổng cấp 60 (R1) → golden L30 không đổi; MỌI hàm đều THUẦN (đọc số liệu đã đo, không đụng store).
 */
export type StanceId = 'binh_dan' | 'dac_san' | 'tien_loi';

/** Cấp mở hệ Định vị tiệm (SPEC §3.9) — golden L30 không chạm (R1). */
export const STANCE_UNLOCK = 60;

export const STANCE_IDS: StanceId[] = ['binh_dan', 'dac_san', 'tien_loi'];

/** Nhãn tiếng Việt + icon cho từng hướng (thẻ + biển). */
export const STANCE_META: Record<StanceId, { icon: string; name: string }> = {
  binh_dan: { icon: '🏷️', name: 'Bình dân' },
  dac_san: { icon: '🏺', name: 'Đặc sản' },
  tien_loi: { icon: '🌙', name: 'Tiện lợi' },
};

// ── Ngưỡng khớp (SPEC §3.4) ──
/** Bình dân: ô kệ phải có giá ≤ 97% giá gợi ý thị trường, và không món nào > 110%. */
export const BINH_DAN_CHEAP_RATIO = 0.97;
export const BINH_DAN_CHEAP_NEED = 0.7;
export const BINH_DAN_OVER_RATIO = 1.1;
/** Đặc sản: ≥ 40% ô kệ là hàng đặc sản + điểm danh tiếng chất lượng ≥ 4,0. */
export const DAC_SAN_SPECIALTY_NEED = 0.4;
export const DAC_SAN_QUALITY_MIN = 4.0;
/** Tiện lợi: mở ≥ 18h/ngày + ≥ 4 dịch vụ + ≥ 3 máy tự phục vụ + khách bỏ chờ ≤ 5%. */
export const TIEN_LOI_OPEN_MIN = 18;
export const TIEN_LOI_SERVICES_MIN = 4;
export const TIEN_LOI_MACHINES_MIN = 3;
export const TIEN_LOI_WALKOUT_MAX = 0.05;

/** Một dòng trong thẻ đo: ví dụ "Giá ≤ 97% thị trường: 62% ô kệ (cần 70%) ✗ — 9 món đang đắt". */
export interface StanceCheck {
  label: string;
  /** Số / tỉ lệ đang có (hiện cho người chơi). */
  have: string;
  /** Điều kiện cần. */
  need: string;
  ok: boolean;
}

export interface StanceFitResult {
  id: StanceId;
  fit: boolean;
  checks: StanceCheck[];
}

/** Số liệu ĐO ĐƯỢC của tiệm hôm nay — do `buildStanceCtx` trong core nạp từ GameState (L1). */
export interface StanceCtx {
  /** Tổng ô kệ đang bày (có món). */
  pricedShelfCells: number;
  /** Ô kệ có giá ≤ 97% giá gợi ý thị trường. */
  cheapCells: number;
  /** Ô kệ có giá > 110% giá gợi ý. */
  overCells: number;
  /** Ô kệ là hàng đặc sản (nhà làm / nhà trồng / món nấu / đặc sản vùng). */
  specialtyCells: number;
  /** Điểm danh tiếng mặt chất lượng (0..5). */
  qualityRating: number;
  /** Giờ mở cửa trung bình trong ngày. */
  openHours: number;
  /** Số dịch vụ quầy đang bật. */
  servicesCount: number;
  /** Số máy tự phục vụ đang đặt. */
  machinesCount: number;
  /** Tỉ lệ khách bỏ về vì chờ (0..1). */
  walkoutQueueRate: number;
}

/**
 * Hàng đặc sản (SPEC §3.4 — hướng Đặc sản): món nấu, hàng nhà làm/hàng xóm, đặc sản vùng, hoặc nhà trồng
 * (homegrown — truyền qua `homegrown`). Dùng để đếm `specialtyCells` khi dựng ctx (L1).
 */
export function isSpecialtyProduct(id: string, homegrown?: ReadonlySet<string> | Record<string, number>): boolean {
  if (COOKED_PRODUCT_IDS.has(id)) return true;
  if (NEIGHBOR_ONLY_IDS.has(id)) return true;
  if (REGION_IDS.has(id)) return true;
  if (homegrown && (homegrown instanceof Set ? homegrown.has(id) : (homegrown as Record<string, number>)[id]! > 0)) return true;
  return false;
}

/** Tỉ lệ ô kệ giá bình dân (rẻ ≤ 97% thị trường) — 0 nếu chưa bày kệ nào. */
export const binhDanCheapRatio = (c: StanceCtx) => (c.pricedShelfCells ? c.cheapCells / c.pricedShelfCells : 0);
/** Tỉ lệ ô kệ đặc sản — 0 nếu chưa bày kệ nào. */
export const dacSanSpecialtyRatio = (c: StanceCtx) => (c.pricedShelfCells ? c.specialtyCells / c.pricedShelfCells : 0);

/** Đo hướng Bình dân (SPEC §3.4): rẻ nhất hẻm. */
export function fitBinhDan(c: StanceCtx): StanceFitResult {
  const pct = binhDanCheapRatio(c);
  const checks: StanceCheck[] = [
    { label: 'Ô kệ giá ≤ 97% thị trường', have: `${Math.round(pct * 100)}%`, need: `≥ ${Math.round(BINH_DAN_CHEAP_NEED * 100)}%`, ok: pct >= BINH_DAN_CHEAP_NEED },
    { label: 'Không món nào giá > 110%', have: `${c.overCells} món`, need: '0 món', ok: c.overCells === 0 },
  ];
  return { id: 'binh_dan', fit: pct >= BINH_DAN_CHEAP_NEED && c.overCells === 0, checks };
}

/** Đo hướng Đặc sản (SPEC §3.4): ngon có tiếng. */
export function fitDacSan(c: StanceCtx): StanceFitResult {
  const pct = dacSanSpecialtyRatio(c);
  const checks: StanceCheck[] = [
    { label: 'Hàng đặc sản trên kệ', have: `${Math.round(pct * 100)}%`, need: `≥ ${Math.round(DAC_SAN_SPECIALTY_NEED * 100)}%`, ok: pct >= DAC_SAN_SPECIALTY_NEED },
    { label: 'Điểm danh tiếng chất lượng', have: c.qualityRating.toFixed(1), need: `≥ ${DAC_SAN_QUALITY_MIN.toFixed(1)}`, ok: c.qualityRating >= DAC_SAN_QUALITY_MIN },
  ];
  return { id: 'dac_san', fit: pct >= DAC_SAN_SPECIALTY_NEED && c.qualityRating >= DAC_SAN_QUALITY_MIN, checks };
}

/** Đo hướng Tiện lợi (SPEC §3.4): lúc nào cũng mở. */
export function fitTienLoi(c: StanceCtx): StanceFitResult {
  const checks: StanceCheck[] = [
    { label: 'Giờ mở cửa mỗi ngày', have: `${c.openHours}h`, need: `≥ ${TIEN_LOI_OPEN_MIN}h`, ok: c.openHours >= TIEN_LOI_OPEN_MIN },
    { label: 'Dịch vụ quầy đang bật', have: `${c.servicesCount}`, need: `≥ ${TIEN_LOI_SERVICES_MIN}`, ok: c.servicesCount >= TIEN_LOI_SERVICES_MIN },
    { label: 'Máy tự phục vụ đặt', have: `${c.machinesCount}`, need: `≥ ${TIEN_LOI_MACHINES_MIN}`, ok: c.machinesCount >= TIEN_LOI_MACHINES_MIN },
    { label: 'Khách bỏ về vì chờ', have: `${Math.round(c.walkoutQueueRate * 100)}%`, need: `≤ ${Math.round(TIEN_LOI_WALKOUT_MAX * 100)}%`, ok: c.walkoutQueueRate <= TIEN_LOI_WALKOUT_MAX },
  ];
  return {
    id: 'tien_loi',
    fit: c.openHours >= TIEN_LOI_OPEN_MIN && c.servicesCount >= TIEN_LOI_SERVICES_MIN && c.machinesCount >= TIEN_LOI_MACHINES_MIN && c.walkoutQueueRate <= TIEN_LOI_WALKOUT_MAX,
    checks,
  };
}

/** Đo cả ba hướng (SPEC §3.4) — L1 "Tiệm đang nghiêng về hướng nào". */
export function stanceFit(c: StanceCtx): StanceFitResult[] {
  return [fitBinhDan(c), fitDacSan(c), fitTienLoi(c)];
}

/** Hướng đang khớp NHIỀU tiêu chí nhất (đo không ép): trả null khi chưa hướng nào ≥ 1 tiêu chí. */
export function leaningStance(c: StanceCtx): StanceId | null {
  let best: StanceFitResult | null = null;
  for (const r of stanceFit(c)) {
    const okCount = r.checks.filter((ch) => ch.ok).length;
    if (okCount > 0 && (!best || okCount > best.checks.filter((ch) => ch.ok).length)) best = r;
  }
  return best?.id ?? null;
}
