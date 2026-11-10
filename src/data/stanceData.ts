import { productById } from './products';
import { referenceSell } from './pricing';
import { isMachine } from './machines';
import { isSpecialtyProduct, type StanceCtx } from './stance';

/** Dữ liệu tối thiểu để đo — GameState thật thoả kiểu này (nhờ cấu trúc), test dựng được dễ. */
export interface StanceSrc {
  furniture?: { type: string; tiers?: { productId: string | null; count?: number }[]; broken?: boolean }[];
  prices?: Record<string, number>;
  biz: { services?: string[]; upgrades?: string[] };
  garden?: { homegrown?: Record<string, number> };
  reviews?: { stars: number }[];
  stats?: { missed?: Partial<Record<string, number>>; customers?: number };
}

/**
 * Hệ 3 L1 (SPEC-CHIEU-SAU §3.4) — dựng `StanceCtx` (số liệu ĐO) từ GameState THẬT để thẻ "Tiệm đang
 * nghiêng về hướng nào" hiển thị. THUẦN ĐỌC (không đổi state/kinh tế/RNG/save → golden giữ nguyên).
 * Tách khỏi stance.ts để stance thuần nhất, file này chỉ biết cách đọc store.
 */
export function buildStanceCtx(s: StanceSrc): StanceCtx {
  const prices = s.prices ?? {};
  let pricedShelfCells = 0;
  let cheapCells = 0;
  let overCells = 0;
  let specialtyCells = 0;
  for (const f of s.furniture ?? []) {
    if (f.type !== 'shelf') continue;
    for (const t of f.tiers ?? []) {
      if (!t.productId) continue;
      const id = t.productId;
      pricedShelfCells++;
      const price = prices[id] ?? productById(id).sell;
      const ratio = price / referenceSell(id);
      if (ratio <= 0.97) cheapCells++;
      if (ratio > 1.1) overCells++;
      if (isSpecialtyProduct(id, s.garden?.homegrown)) specialtyCells++;
    }
  }
  const machinesCount = (s.furniture ?? []).filter((f) => isMachine(f.type) && !f.broken).length;
  const servicesCount = (s.biz.services ?? []).length;
  const last30 = (s.reviews ?? []).slice(-30);
  const rating = last30.length ? last30.reduce((n, r) => n + (r.stars ?? 0), 0) / last30.length : 3.5;
  const waitMiss = s.stats?.missed?.wait ?? 0;
  const customers = s.stats?.customers ?? 0;
  const walkoutQueueRate = customers > 0 ? waitMiss / customers : 0;
  const night = (s.biz.upgrades ?? []).includes('night');
  const openHours = night ? 24 : 15; // ngày 8:00–22:30 ≈ 14,5h; mở ca đêm → 24h
  return {
    pricedShelfCells,
    cheapCells,
    overCells,
    specialtyCells,
    qualityRating: rating,
    openHours,
    servicesCount,
    machinesCount,
    walkoutQueueRate,
  };
}
