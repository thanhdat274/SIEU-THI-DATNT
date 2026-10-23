/**
 * Dữ liệu sổ góp xóm — Civic Bundle Defs (OpenSpec `civic-city-goals`, D2).
 */

import { PRODUCT_MAP } from '../products';
import { civicDefOf } from './civic';

export type BundleSlotKind = 'goods' | 'cash';

export interface BundleSlotDef {
  id: string;
  label: string;
  kind: BundleSlotKind;
  acceptedProductIds?: string[];
  quantity?: number;
  /** Ô cash (Quỹ xây dựng): được TÍNH từ công thức cân bằng 80% — không ghi tay (xem `civicBundleCashAmount`). */
  amount?: number;
}

export interface CivicBundleDef {
  id: string;
  buildingTypeId: string;
  revealedByCityLevel: number;
  slots: BundleSlotDef[];
}

/** Làm tròn tới 50.000 ₫ (mức tiện cho ô Quỹ xây dựng). */
export function round50k(n: number): number {
  return Math.round(n / 50_000) * 50_000;
}

/** Giá xây của loại công trình của sổ — từ CIVIC_DEFS (nguồn duy nhất, không sửa các số đó). */
export function bundleBuildCost(bundle: CivicBundleDef): number {
  return civicDefOf(bundle.buildingTypeId)?.buildCost ?? 0;
}

/**
 * Giá trị HÀNG DỰ KIẾN của sổ (dùng chung cho data/validate/UI):
 * Σ (quantity × giá nhập MÓN RẺ NHẤT trong `acceptedProductIds`) của từng ô hàng.
 */
export function expectedBundleGoodsValue(bundle: CivicBundleDef): number {
  return bundle.slots.reduce((sum, slot) => {
    if (slot.kind !== 'goods') return sum;
    const unit = Math.min(...(slot.acceptedProductIds ?? []).map(pid => PRODUCT_MAP[pid]?.purchasePrice ?? 0));
    return sum + (slot.quantity ?? 0) * (Number.isFinite(unit) ? unit : 0);
  }, 0);
}

/**
 * Số tiền ô "Quỹ xây dựng" (D2 cân bằng 2.1): KHÔNG ghi số tay;
 * amount = round50k(0,8 × giá xây − giá trị hàng dự kiến), tối thiểu 0.
 */
export function civicBundleCashAmount(bundle: CivicBundleDef): number {
  return Math.max(0, round50k(0.8 * bundleBuildCost(bundle) - expectedBundleGoodsValue(bundle)));
}

/** Tổng giá trị góp DỰ KIẾN của sổ = hàng + quỹ (dùng kiểm tra ≤ giá xây). */
export function expectedBundleTotalValue(bundle: CivicBundleDef): number {
  return expectedBundleGoodsValue(bundle) + civicBundleCashAmount(bundle);
}

/** Gán `amount` cho ô cash theo công thức cân bằng (gọi ở bước dựng CIVIC_BUNDLES). */
function resolveCashAmounts(bundle: CivicBundleDef): CivicBundleDef {
  const cashIndex = bundle.slots.findIndex(s => s.kind === 'cash');
  if (cashIndex >= 0) bundle.slots[cashIndex].amount = civicBundleCashAmount(bundle);
  return bundle;
}

const BUNDLE_PARK: CivicBundleDef = {
  id: 'bundle_park',
  buildingTypeId: 'park',
  revealedByCityLevel: 4,
  slots: [
    { id: 'slot_park_hygiene_1', label: 'Nước rửa tay / lau kính', kind: 'goods', acceptedProductIds: ['nuoc_rua_tay', 'nuoc_lau_kinh'], quantity: 10 },
    { id: 'slot_park_hygiene_2', label: 'Xà phòng / giấy vệ sinh', kind: 'goods', acceptedProductIds: ['xa_phong', 'giay_ve_sinh'], quantity: 10 },
    { id: 'slot_park_snack', label: 'Snack khô', kind: 'goods', acceptedProductIds: ['bim_bim_oishi', 'banh_poca', 'banh_gao'], quantity: 12 },
    { id: 'slot_park_cash', label: 'Quỹ xây dựng', kind: 'cash' },
  ],
};

const BUNDLE_CLINIC: CivicBundleDef = {
  id: 'bundle_clinic',
  buildingTypeId: 'clinic',
  revealedByCityLevel: 5,
  slots: [
    { id: 'slot_clinic_hygiene', label: 'Xà phòng / Kem đánh răng', kind: 'goods', acceptedProductIds: ['xa_phong', 'kem_danh_rang'], quantity: 10 },
    { id: 'slot_clinic_milk', label: 'Sữa tươi / Sữa chua', kind: 'goods', acceptedProductIds: ['sua_tuoi', 'sua_chua', 'sua_dau_nanh'], quantity: 20 },
    { id: 'slot_clinic_cash', label: 'Quỹ xây dựng', kind: 'cash' },
  ],
};

const BUNDLE_WARD_POLICE: CivicBundleDef = {
  id: 'bundle_ward_police',
  buildingTypeId: 'ward_police',
  revealedByCityLevel: 7,
  slots: [
    { id: 'slot_ward_meal_1', label: 'Phở / Hủ tiếu gói', kind: 'goods', acceptedProductIds: ['pho_goi', 'hu_tieu_goi'], quantity: 15 },
    { id: 'slot_ward_milk', label: 'Sữa hộp / Sữa chua', kind: 'goods', acceptedProductIds: ['sua_hop', 'sua_chua'], quantity: 15 },
    { id: 'slot_ward_drink', label: 'Nước suối / Nước khoáng', kind: 'goods', acceptedProductIds: ['nuoc_suoi', 'nuoc_khoang'], quantity: 20 },
    { id: 'slot_ward_cash', label: 'Quỹ xây dựng', kind: 'cash' },
  ],
};

const BUNDLE_PRIMARY_SCHOOL: CivicBundleDef = {
  id: 'bundle_primary_school',
  buildingTypeId: 'primary_school',
  revealedByCityLevel: 9,
  slots: [
    { id: 'slot_school_bread', label: 'Bánh mì / Bánh bao', kind: 'goods', acceptedProductIds: ['banh_mi_que', 'banh_mi_goi', 'banh_bao'], quantity: 15 },
    { id: 'slot_school_milk', label: 'Sữa đậu nành / Sữa bắp', kind: 'goods', acceptedProductIds: ['sua_dau_nanh', 'sua_lua_mach'], quantity: 20 },
    { id: 'slot_school_candy', label: 'Kẹo / Sô cô la', kind: 'goods', acceptedProductIds: ['keo_dua', 'keo_me', 'socola_thanh'], quantity: 20 },
    { id: 'slot_school_cash', label: 'Quỹ xây dựng', kind: 'cash' },
  ],
};

export const CIVIC_BUNDLES: readonly CivicBundleDef[] = [
  resolveCashAmounts(BUNDLE_PARK),
  resolveCashAmounts(BUNDLE_CLINIC),
  resolveCashAmounts(BUNDLE_WARD_POLICE),
  resolveCashAmounts(BUNDLE_PRIMARY_SCHOOL),
];

export function civicBundleById(id: string): CivicBundleDef | undefined {
  return CIVIC_BUNDLES.find((b) => b.id === id);
}

export function civicBundlesForLevel(level: number): CivicBundleDef[] {
  return CIVIC_BUNDLES.filter((b) => b.revealedByCityLevel === level);
}

export function revealedBundlesAtLevel(cityLevel: number): CivicBundleDef[] {
  return CIVIC_BUNDLES.filter((b) => b.revealedByCityLevel <= cityLevel);
}

export function validateCivicBundles(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const bundle of CIVIC_BUNDLES) {
    if (seenIds.has(bundle.id)) {
      errors.push(`Trùng id bundle: ${bundle.id}`);
    }
    seenIds.add(bundle.id);

    const cashSlots = bundle.slots.filter((s) => s.kind === 'cash');
    const goodsSlots = bundle.slots.filter((s) => s.kind === 'goods');
    if (cashSlots.length !== 1) {
      errors.push(`${bundle.id}: phải có đúng 1 ô cash (có ${cashSlots.length})`);
    }
    if (goodsSlots.length < 2 || goodsSlots.length > 3) {
      errors.push(`${bundle.id}: phải có 2–3 ô goods (có ${goodsSlots.length})`);
    }

    for (const slot of bundle.slots) {
      if (slot.kind === 'cash') {
        // Cân bằng 2.1: amount được TÍNH từ công thức 80% (không ghi tay).
        const derived = civicBundleCashAmount(bundle);
        if (slot.amount === undefined || slot.amount !== derived) {
          errors.push(`${bundle.id}.${slot.id}: cash amount phải = round50k(0,8×giá xây − hàng dự kiến) (${derived}), đang ${slot.amount}`);
        }
        if (derived < 0) {
          errors.push(`${bundle.id}.${slot.id}: quỹ xây dựng không thể âm (${derived})`);
        }
      } else {
        if (!slot.acceptedProductIds || slot.acceptedProductIds.length < 2) {
          errors.push(`${bundle.id}.${slot.id}: goods phải có ≥ 2 acceptedProductIds`);
        }
        for (const pid of slot.acceptedProductIds ?? []) {
          if (!PRODUCT_MAP[pid]) {
            errors.push(`${bundle.id}.${slot.id}: sản phẩm không tồn tại trong catalog: ${pid}`);
          }
        }
        if (!slot.quantity || slot.quantity <= 0) {
          errors.push(`${bundle.id}.${slot.id}: quantity phải > 0`);
        }
      }
    }

    // Cân bằng 2.1: tổng giá trị góp DỰ KIẾN (hàng + quỹ) ≤ giá xây; quỹ ≥ 0.
    if (expectedBundleTotalValue(bundle) > bundleBuildCost(bundle)) {
      errors.push(`${bundle.id}: tổng giá trị góp dự kiến (${expectedBundleTotalValue(bundle)}) > giá xây (${bundleBuildCost(bundle)})`);
    }
  }

  return { valid: errors.length === 0, errors };
}