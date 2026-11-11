import { COOKED_PRODUCT_IDS } from './recipes';
import { NEIGHBOR_ONLY_IDS } from './homemade';
import { REGION_IDS } from './regionSpecialty';
import { referenceSell } from './pricing';
import { PRICE_RULES } from './pricing';

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

/** L6 — Đổi hướng biển: trả tiền làm biển 5tr × bậc hiện tại (SPEC §3.4 "5tr × bậc tiệm"). Lần treo đầu MIỄN PHÍ. */
export const STANCE_SWITCH_BASE_COST = 5_000_000;

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

// ──────────────────────────────────────────────
// Hệ 3 L3 (SPEC-CHIEU-SAU §3.5, §3.9) — TREO BIỂN + BẬC + HIỆU ỨNG BÌNH DÂN
// ──────────────────────────────────────────────

/** Trạng thái biển hiệu đang treo (biz.stance). THIẾU ở save cũ = chưa treo (vô hại). */
export interface StanceState {
  id: StanceId;
  /** Ngày treo biển (cho lịch sử). */
  since: number;
  /** Tổng số ngày KHỚP hướng kể từ khi treo (quyết định bậc). */
  fitDays: number;
  /** Số ngày LỆCH liên tiếp (đủ 3 thì tụt 1 bậc). */
  missStreak: number;
  /** Ngày đang "làm lại biển" (đổi hướng, L6): trước ngày này không có hiệu ứng. THIẾU = không đổi lại. */
  switchUntil?: number;
}

/** Ngày khớp tích lũy để lên từng bậc (SPEC §3.5): 3/10/21/35/50 ngày → bậc 1…5. */
export const STANCE_TIER_DAYS = [3, 10, 21, 35, 50] as const;

/** Bậc biển (0..5) theo tổng ngày khớp; 0 = chưa có hiệu ứng. */
export function stanceTier(fitDays: number): number {
  let t = 0;
  for (const d of STANCE_TIER_DAYS) if (fitDays >= d) t++;
  return t;
}

/** Biển đang CÓ HIỆU LỰC không (không treo, hoặc đang làm lại biển)? */
export function stanceActive(st: StanceState | undefined, day: number): boolean {
  if (!st) return false;
  if (st.switchUntil !== undefined && day < st.switchUntil) return false;
  return true;
}

/**
 * Hệ 3 L3 — Cập nhật biển mỗi đêm (gọi từ endDay). `fit` = hôm nay KHỚP hướng đang treo hay không.
 * Khớp → +1 ngày (fitDays) và xoá missStreak. Lệch → missStreak++; đủ 3 ngày lệch liền thì tụt 1 bậc
 * (fitDays về ngưỡng bậc dưới, missStreak về 0 — khỏi tụt dồn mỗi đêm). Đang làm lại biển → không đổi.
 */
export function applyStanceDay(st: StanceState, fit: boolean, day: number): StanceState {
  if (st.switchUntil !== undefined && day < st.switchUntil) return st;
  const miss = fit ? 0 : (st.missStreak ?? 0) + 1;
  let fitDays = (st.fitDays ?? 0) + (fit ? 1 : 0);
  if (miss >= 3) {
    const cur = stanceTier(fitDays);
    const lowerTier = Math.max(0, cur - 1);
    fitDays = lowerTier > 0 ? STANCE_TIER_DAYS[lowerTier - 1] : 0;
  }
  return { id: st.id, since: st.since, fitDays, missStreak: miss >= 3 ? 0 : miss, ...(st.switchUntil !== undefined ? { switchUntil: st.switchUntil } : {}) };
}

/** Map khớp theo từng hướng (cả ba) — để endDay lấy fit của ĐÚNG hướng đang treo. */
export function stanceFitByDirection(c: StanceCtx): Record<StanceId, boolean> {
  const m: Record<StanceId, boolean> = { binh_dan: false, dac_san: false, tien_loi: false };
  for (const r of stanceFit(c)) m[r.id] = r.fit;
  return m;
}

export interface StanceStateRef {
  stance?: StanceState;
  /** Hệ3-L8: biển THỨ HAI khi đủ 3 ấn — treo hai biển cùng lúc, hiệu ứng mỗi biển còn 60% (SPEC §3.7). */
  stance2?: StanceState;
  /** L8 — các ấn định vị giữ qua NG+ (đọc từ `biz.prestige.seals`). Thiếu = rỗng. */
  prestige?: { seals?: StanceId[] };
}
/** Bậc hiện tại của khách hàng (đọc entry point có biz.stance). */
export const stanceTierOf = (e: StanceStateRef) => (e.stance ? stanceTier(e.stance.fitDays ?? 0) : 0);

/**
 * Hệ3-L8 — danh sách biển ĐANG CÓ HIỆU LỰC (cả biển chính + biển phụ). `mult` = 1 khi chỉ một biển
 * (giữ NGUYÊN hành vi hiện tại — mọi test/golden không đổi), 0.6 cho MỖI biển khi treo hai biển
 * (SPEC §3.7 "hiệu ứng mỗi biển còn 60%"). day mặc định 0 như các hàm hiệu ứng hiện tại.
 */
export function activeSigns(e: StanceStateRef, day = 0): Array<{ st: StanceState; mult: number }> {
  const a = stanceActive(e.stance, day) ? e.stance : undefined;
  const b = stanceActive(e.stance2, day) ? e.stance2 : undefined;
  if (a && b) return [{ st: a, mult: 0.6 }, { st: b, mult: 0.6 }];
  if (a) return [{ st: a, mult: 1 }];
  if (b) return [{ st: b, mult: 1 }];
  return [];
}

// ── Hệ 3 L8 — ẤN định vị giữ qua NG+ (SPEC §3.7) ──
// Đạt bậc 5 một hướng thì nhận ẤN, lưu `biz.prestige.seals`. Lợi vĩnh viễn nhỏ, có hiệu lực dù vòng sau
// treo biển gì (chỉ chơi đơn). Earning gated bởi bậc; hiệu lực gated chỉ bởi có ấn hay không → tiệm không
// có ấn (golden L30, mọi save cũ, tiệm chưa NG+) trả đúng trung tính (1 / 0).
export const STANCE_SEAL_TIER = 5 as const; // bậc 5 → nhận ấn (STANCE_TIER_DAYS[4] = 50 ngày khớp)
export const SEAL_IMPORT_DISCOUNT = 0.98 as const; // Ấn Bình dân: nhập mọi mối rẻ 2%
export const SEAL_YIELD_BONUS = 1 as const; // Ấn Đặc sản: mỗi mẻ ra thêm 1 đơn vị
export const SEAL_PATIENCE_BONUS = 0.10 as const; // Ấn Tiện lợi: kiên nhẫn mọi khách +10%

/** Danh sách ấn đang giữ. */
export const stanceSeals = (e: StanceStateRef): StanceId[] => e.prestige?.seals ?? [];
/** Đang giữ ấn hướng này không. */
export const hasStanceSeal = (e: StanceStateRef, id: StanceId): boolean => stanceSeals(e).includes(id);
/** Bậc biển đã đủ để nhận ấn chưa (bậc 5). */
export const isStanceSealable = (st: StanceState): boolean => stanceTier(st.fitDays ?? 0) >= STANCE_SEAL_TIER;

/** Ấn Bình dân — nhập hàng rẻ 2% (nhân vào giá mua). Không có ấn = 1. */
export function sealImportMul(e: StanceStateRef): number { return hasStanceSeal(e, 'binh_dan') ? SEAL_IMPORT_DISCOUNT : 1; }
/** Ấn Tiện lợi — kiên nhẫn xếp hàng +10% (nhân vào patience). Không có ấn = 1. */
export function sealPatience(e: StanceStateRef): number { return hasStanceSeal(e, 'tien_loi') ? 1 + SEAL_PATIENCE_BONUS : 1; }
/** Ấn Đặc sản — mỗi mẻ nấu/phơi ra thêm N đơn vị (cộng vào outputQty). Không có ấn = 0. */
export function sealYieldBonus(e: StanceStateRef): number { return hasStanceSeal(e, 'dac_san') ? SEAL_YIELD_BONUS : 0; }

// ── Hiệu ứng kinh tế (SPEC §3.4) ──
// Mỗi hướng thưởng/phạt tăng TUYẾN TÍNH theo bậc 1→5; con số dưới là ở BẬC 5. Cổng cấp 60 (R1) và
// stanceActive → khi KHÔNG treo biển / không hiệu lực / hướng khác thì mọi hệ số trả đúng giá trị TRUNG TÍNH
// (1 hoặc cap cũ) nên golden L30 & tiệm không treo biển KHÔNG đổi. L3 chỉ bật hiệu ứng hướng BÌNH DÂN;
// Đặc sản / Tiện lợi chưa có (L4/L5) → neutral.
const binhDanStep = (tier: number) => tier / 5; // hệ số tuyến tính 0..1 theo bậc

/** Thừa số lưu lượng khách theo hướng biển. Bình dân +20% (bậc 5); Đặc sản −15% (bậc 5, giá phải trả —
 *  "ngon có tiếng" nên ít khách đường phố hơn). Tiện lợi chưa có (L5). Không treo biển / hướng khác = 1. */
export function stanceTraffic(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t) continue;
    if (st.id === 'binh_dan') v += 0.2 * binhDanStep(t) * mult;
    else if (st.id === 'dac_san') v -= 0.15 * binhDanStep(t) * mult;
  }
  return v;
}

/**
 * Lợi Đặc sản — hàng ĐẶC SẢN (món nấu, nhà làm/hàng xóm, đặc sản vùng, nhà trồng): khách chịu giá HƠN,
 * sensitivity ×0,7 (bậc 5) → nhân vào `keepChance`. Hàng công nghiệp không được lợi gì (trả 1). Dùng bậc
 * tuyến tính chung (để cân bằng 3 hướng so sánh được cùng thang). Không treo / hướng khác / hàng thường = 1.
 */
export function stanceSensitivity(e: StanceStateRef, productId: string, step: number = binhDanStep(stanceTierOf(e))): number {
  void step; // bậc tính theo từng biển (activeSigns) — tham số giữ để không vỡ API caller
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'dac_san' || !isSpecialtyProduct(productId)) continue;
    v -= 0.3 * binhDanStep(t) * mult;
  }
  return v;
}

/**
 * Giá phải trả Đặc sản — khách "ngon có tiếng" soi kỹ hạn dùng: tỉ lệ chê hàng cận hạn
 * (`nearExpiryRefuseChance`) ×2 (bậc 5). Không treo / hướng khác = 1.
 */
export function stanceNearExpiry(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'dac_san') continue;
    v += 1 * binhDanStep(t) * mult;
  }
  return v;
}

/**
 * Lợi Đặc sản — hàng mang nhãn nhà trồng/nhà làm bán +30% thay vì +20% (bậc 5). Trả hệ số nhân lên
 * `HOMEGROWN_PREMIUM` (0.2): bậc 5 → 1.5 (0.3/0.2 = +30%). Không treo / hướng khác = 1 (giữ +20%).
 */
export function stanceHomegrownMul(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'dac_san') continue;
    v += 0.5 * binhDanStep(t) * mult;
  }
  return v;
}

/**
 * Lợi Đặc sản — nhà phê bình ghé thường hơn: xác suất có lời mời trong ngày ×2 (bậc 5). Trả hệ số nhân
 * lên `CRITIC_CHANCE`. Không treo / hướng khác = 1.
 */
export function stanceCriticChance(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'dac_san') continue;
    v += 1 * binhDanStep(t) * mult;
  }
  return v;
}

/**
 * Lợi Đặc sản — giỏ có hàng đặc sản (đồ đã mua, không tính lời hẹn giữ món) thì mua THÊM 1 món (bậc 5).
 * Trả số món thêm (int 0..1). Không treo / hướng khác = 0. Gọi ở nơi chốt `c.wants`; món thêm do bot/chủ
 * chọn như món thường nên không tạo chuỗi RNG riêng (an toàn khi không treo biển).
 */
export function stanceBasketAdd(e: StanceStateRef): number {
  for (const { st } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (st.id === 'dac_san' && binhDanStep(t) >= 1) return 1;
  }
  return 0;
}

// ── Hiệu ứng Tiện lợi (L5) ────────────────────────────────────────────────

/** Lợi Tiện lợi — dịch vụ quầy & máy tự phục vụ thu THÊM +25% (bậc 5). Nhân vào phí trước khi ghi doanh
 *  thu (`earnService`). Không treo / hướng khác = 1. */
export function stanceServiceMul(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'tien_loi') continue;
    v += 0.25 * binhDanStep(t) * mult;
  }
  return v;
}

/** Lợi Tiện lợi — khách đêm +50% (bậc 5). Nhân vào nhịp `bandTraffic` khi đang là ca đêm (`isNight`).
 *  Không treo / hướng khác = 1. */
export function stanceNightMul(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'tien_loi') continue;
    v += 0.5 * binhDanStep(t) * mult;
  }
  return v;
}

/** Lợi Tiện lợi — khung vắng (`slowBands`) được thêm +15% khách (bậc 5). Nhân vào nhịp `bandTraffic`
 *  khi đang trong khung giờ vắng. Không treo / hướng khác = 1. */
export function stanceSlowMul(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'tien_loi') continue;
    v += 0.15 * binhDanStep(t) * mult;
  }
  return v;
}

/** Giá phải trả Tiện lợi — khách vội: kiên nhẫn xếp hàng −20% (bậc 5). Nhân vào `patience`
 *  (càng thấp càng dễ bỏ về khi chờ). Không treo / hướng khác = 1. (GĐ2256 đo: mức −20% bậc5 làm bot sim
 *  mất lượng khách lớn vì khách bỏ hàng chờ; dải ±5-20% §3.8 chưa đạt — L5 để mức này rồi chốt khi cân
 *  bằng chung 3 hướng.) */
export function stancePatience(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'tien_loi') continue;
    v -= 0.2 * binhDanStep(t) * mult;
  }
  return v;
}

/** Giá phải trả Tiện lợi — giỏ nhỏ hơn 1 món (bậc 5). Trả số món trừ (int 0..1) để khách vội mua ít. */
export function stanceBasketCut(e: StanceStateRef): number {
  for (const { st } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (st.id === 'tien_loi' && binhDanStep(t) >= 1) return 1;
  }
  return 0;
}

/** Lợi Bình dân — trần "rẻ kéo khách" (lowPriceDemandCap) 1.15 → 1.25 (bậc 5). Không treo = cap cũ. */
export function stanceLowCap(e: StanceStateRef): number {
  let v = PRICE_RULES.lowPriceDemandCap;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'binh_dan') continue;
    v += 0.1 * binhDanStep(t) * mult;
  }
  return v;
}

/** Lợi Bình dân — "rẻ kéo khách": độ dốc hút giá rẻ ×(1+3·bậc/5) (bậc 5 = ×4). Biển Bình dân sống nhờ
 *  khối lượng bán rẻ → cần độ dốc thật để hạ giá kéo đủ khách bù margin. (GĐ2254 đo: slope mặc định 0.5
 *  quá yếu — hạ 3-5% không kéo nổi khách; nhưng quá mạnh như ×9 làm bot hết hàng. Để mức vừa, chốt khi
 *  cân bằng cả 3 hướng ở L5.) Không treo / hướng khác = 1 (slope gốc). */
export function stancePullSlope(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'binh_dan') continue;
    v += 3 * binhDanStep(t) * mult;
  }
  return v;
}

/** Giá phải trả Bình dân — khách đã quen rẻ: món BÁN TRÊN thị trường bị chê nặng hơn 50% (bậc 5).
 *  Hệ số này nhân vào độ nhạy khách trong `keepChance` (chỉ phần giá vượt thị trường). Không treo /
 *  bán rẻ / hướng khác = 1. */
export function stanceOverSensitivity(e: StanceStateRef, productId: string, price: number): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'binh_dan' || price <= referenceSell(productId)) continue;
    v += 0.5 * binhDanStep(t) * mult;
  }
  return v;
}

/** Giá phải trả Bình dân — sao món (dishPriceMul) chỉ còn hưởng NỬA (bậc 5). Không treo = 1 (hưởng đủ). */
export function stanceDishMul(e: StanceStateRef): number {
  let v = 1;
  for (const { st, mult } of activeSigns(e)) {
    const t = stanceTier(st.fitDays ?? 0);
    if (!t || st.id !== 'binh_dan') continue;
    v -= 0.5 * binhDanStep(t) * mult;
  }
  return v;
}

