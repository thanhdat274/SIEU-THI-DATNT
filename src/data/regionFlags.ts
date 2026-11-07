import { REGION_PRODUCTS, type RegionName } from './regionSpecialty';
import { dishStars } from './dishStars';
import { furnitureDef } from './furniture';
import type { Furniture } from '../core/store';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1505 — BẢNG HIỆU VINH DANH ĐẶC SẢN 4 MIỀN (bản Việt hoá hệ "cờ vinh danh ẩm thực"
// của khu ăn tại chỗ tham khảo — TONG-HOP mục C8): treo bảng hiệu 1 miền, khi tiệm
// bày đủ bộ đặc sản miền đó thì bảng "sáng" — cộng điểm 🩷 kéo khách và +% giá cho
// chính đặc sản miền đó. Đủ bộ + mọi loại lên 1★ thì bảng nâng bậc cao nhất.
// Helper THUẦN — không đụng rng, không persist; bảng hiệu chỉ đặt được từ cấp 42 nên
// mọi đường sim chặt (golden L30) giữ nguyên.
// ─────────────────────────────────────────────────────────────────────────────

/** 4 miền và bộ đặc sản của từng miền (từ dữ liệu REGION_PRODUCTS — nguồn chân lý duy nhất). */
export interface RegionFlag { id: string; type: string; name: RegionName; items: string[] }

const REGION_META: { name: RegionName; type: string; icon: string }[] = [
  { name: 'Bắc', type: 'bang_hieu_bac', icon: '🏔️' },
  { name: 'Trung', type: 'bang_hieu_trung', icon: '⛵' },
  { name: 'Nam', type: 'bang_hieu_nam', icon: '🌾' },
  { name: 'Tây Nguyên', type: 'bang_hieu_tay_nguyen', icon: '🌲' },
];

export const REGION_FLAGS: RegionFlag[] = REGION_META.map((m) => ({
  id: m.type.replace('bang_hieu_', ''),
  type: m.type,
  name: m.name,
  items: REGION_PRODUCTS.filter((p) => p.region === m.name).map((p) => p.id),
}));

export const regionFlagByType = (type: string): RegionFlag | null =>
  REGION_FLAGS.find((f) => f.type === type) ?? null;

/**
 * Bậc bảng hiệu: 0 = chưa đủ bộ, 1 = bày đủ bộ đặc sản miền trên kệ,
 * 2 = đủ bộ VÀ mọi loại đều đã lên 1★ (bán đông đủ, vinh danh cao nhất).
 */
export function regionFlagTier(flag: RegionFlag, stocked: ReadonlySet<string>, served: Record<string, number>): 0 | 1 | 2 {
  for (const id of flag.items) {
    if (!stocked.has(id)) return 0;
  }
  for (const id of flag.items) {
    if (dishStars(served[id] ?? 0) < 1) return 1;
  }
  return 2;
}

/** Điểm 🩷 thưởng thêm theo bậc (decor gốc của bảng hiệu là 4): đủ bộ +4, vinh danh +12. */
export const FLAG_TIER_DECOR = [0, 4, 12] as const;
/** +% giá bán cho đặc sản của miền theo bậc: đủ bộ +2%, vinh danh +5%. */
export const FLAG_TIER_PRICE = [0, 0.02, 0.05] as const;

/** Món đang bày trên kệ (kệ hỏng không tính) — nguồn chân lý "bày bán" cho bảng hiệu. */
export function stockedProductIds(list: Furniture[]): Set<string> {
  const out = new Set<string>();
  for (const f of list) {
    if (f.broken || f.trial) continue;
    if (furnitureDef(f.type).slots <= 0) continue;
    for (const t of f.tiers) {
      if (t.productId && t.count > 0) out.add(t.productId);
    }
  }
  return out;
}

/** Tổng điểm 🩷 thưởng của mọi bảng hiệu đang treo (cộng vào decorScoreOf ở công thức kéo khách). */
export function regionFlagDecorBonus(list: Furniture[], stocked: ReadonlySet<string>, served: Record<string, number>): number {
  let bonus = 0;
  for (const f of list) {
    if (f.broken || f.trial) continue;
    const flag = regionFlagByType(f.type);
    if (!flag) continue;
    bonus += FLAG_TIER_DECOR[regionFlagTier(flag, stocked, served)];
  }
  return bonus;
}

/** Hệ số giá của 1 món đặc sản theo bảng hiệu miền nó (1 = không có thưởng). */
export function regionPriceMul(productId: string, list: Furniture[], stocked: ReadonlySet<string>, served: Record<string, number>): number {
  const prod = REGION_PRODUCTS.find((p) => p.id === productId);
  if (!prod) return 1;
  const flag = REGION_FLAGS.find((f) => f.name === prod.region);
  if (!flag) return 1;
  const tier = regionFlagTier(flag, stocked, served);
  return 1 + FLAG_TIER_PRICE[tier];
}
