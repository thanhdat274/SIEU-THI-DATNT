import { PRODUCT_MAP } from './products';
import { RECIPES } from './recipes';

/**
 * Combo — suất/bữa gộp của bếp đa món (OpenSpec `multi-dish-kitchen-combos`, GĐ4 mục 5).
 *
 * Cách biểu diễn (qđ chủ dự án, phương án A): combo là một thành phẩm "suất" được LẮP RÁP qua một
 * `Recipe` tại trạm của shop, với nguyên liệu = các món thành phẩm của chính shop đó (FEFO).
 * Đầu ra lên kệ, bán như món thường. Vì vậy logic bán/checkout/COGS/save tái dùng trọn pipeline
 * `Recipe`/`ProductionJob` có sẵn — không cần mã bán riêng.
 *
 * `COMBOS` ở đây là lớp dữ liệu tự khai báo + tiện ích (giá, validate) để màn hình danh sách combo
 * hiển thị điều kiện/giá, và để kiểm tra tính nhất quán với `RECIPES` (mỗi combo phải có recipe tương ứng).
 */
export interface Combo {
  id: string;
  name: string;
  /** `stationShopId` (FIXTURE_SHOP) của trạm lắp ráp combo (thuộc shop sở hữu combo). */
  shopStationShopId: string;
  /** Các món thành phẩm của shop cấu thành combo (≥2). Là đầu ra của recipe tại `shopStationShopId`. */
  memberProductIds: readonly string[];
  /** Chiết khấu 0..0.5 (PROVISIONAL: 8–15%). */
  discountFraction: number;
  unlockLevel: number;
  basePopularity: number;
  description: string;
}

export const COMBOS: readonly Combo[] = [
  {
    id: 'combo_xoi_doi',
    name: 'Suất Xôi Đôi',
    shopStationShopId: 'quay_xoi',
    memberProductIds: ['xoi_man_tp', 'xoi_trung_tp'],
    discountFraction: 0.1,
    unlockLevel: 36,
    basePopularity: 0.45,
    description: 'Hộp gồm 2 suất xôi (mặn + trứng) giá ưu đãi.',
  },
  {
    id: 'combo_nuoc_doi',
    name: 'Combo Hai Ly',
    shopStationShopId: 'drink_counter',
    memberProductIds: ['tra_sua_tp', 'ca_phe_sua_da_tp'],
    discountFraction: 0.1,
    unlockLevel: 26,
    basePopularity: 0.5,
    description: 'Trà sữa + cà phê sữa đá giá combo tiết kiệm.',
  },
];

export const COMBO_MAP: Record<string, Combo> = Object.fromEntries(COMBOS.map(c => [c.id, c]));

/** Mã thành phẩm combo (đơn vị bán được) = `${combo.id}_tp`, khớp id sản phẩm trong PRODUCED_PRODUCTS. */
export function comboProductId(combo: Combo): string {
  return `${combo.id}_tp`;
}

/** Giá combo = tổng giá bán thành phần × (1 − discount). Làm tròn về số nguyên gần nhất. */
export function comboSellingPrice(combo: Combo): number {
  const retailTotal = combo.memberProductIds.reduce((sum, pid) => sum + (PRODUCT_MAP[pid]?.baseSellingPrice ?? 0), 0);
  return Math.round(retailTotal * (1 - combo.discountFraction));
}

/**
 * Giá vốn ước lượng của combo (dùng làm `purchasePrice` fallback của thành phẩm combo khi lô thiếu unitCost).
 * = tổng giá vốn khai báo của các món thành phẩm cấu thành.
 */
export function comboCost(combo: Combo): number {
  return combo.memberProductIds.reduce((sum, pid) => sum + (PRODUCT_MAP[pid]?.purchasePrice ?? 0), 0);
}

/**
 * Kiểm tra tính nhất quán: mỗi combo phải có ≥2 thành viên là thành phẩm của đúng trạm, discount hợp lệ,
 * và phải có một `Recipe` trong `RECIPES` lắp ráp đúng combo (đầu ra = mã combo, nguyên liệu = thành viên).
 */
export function validateCombos(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const combo of COMBOS) {
    if (ids.has(combo.id)) errors.push(`combo trùng id: ${combo.id}`);
    ids.add(combo.id);
    if (combo.memberProductIds.length < 2) errors.push(`combo ${combo.id} cần ≥2 thành viên`);
    if (combo.discountFraction <= 0 || combo.discountFraction > 0.5) errors.push(`combo ${combo.id} discount nằm ngoài (0, 0.5]`);
    for (const pid of combo.memberProductIds) {
      const p = PRODUCT_MAP[pid];
      if (!p) { errors.push(`combo ${combo.id} thành viên ${pid} không có trong PRODUCT_MAP`); continue; }
      // Thành viên phải là thành phẩm của chính trạm (tức thuộc shop sở hữu combo) — bảo đảm lắp ráp tại chỗ.
      const memberRecipe = RECIPES.find(r => r.outputProductId === pid);
      if (!memberRecipe) { errors.push(`combo ${combo.id} thành viên ${pid} không phải thành phẩm (thiếu recipe)`); continue; }
      if (memberRecipe.stationShopId !== combo.shopStationShopId) errors.push(`combo ${combo.id} thành viên ${pid} không sản xuất tại trạm ${combo.shopStationShopId}`);
    }
    // Phải có recipe lắp ráp combo (đầu ra = combo.id_tp).
    const productId = comboProductId(combo);
    const recipe = RECIPES.find(r => r.outputProductId === productId);
    if (!recipe) { errors.push(`combo ${combo.id} thiếu recipe lắp ráp (đầu ra ${productId})`); continue; }
    if (recipe.stationShopId !== combo.shopStationShopId) errors.push(`combo ${combo.id} recipe lắp ráp sai trạm`);
    // Recipe phải tiêu đúng mỗi thành viên ≥1.
    for (const pid of combo.memberProductIds) {
      const needed = recipe.inputs.find(i => i.productId === pid)?.quantity ?? 0;
      if (needed < 1) errors.push(`combo ${combo.id} recipe không tiêu thành viên ${pid}`);
    }
    // Giá khai báo của thành phẩm combo phải khớp giá combo ước lượng.
    const cp = PRODUCT_MAP[productId];
    if (cp && cp.baseSellingPrice !== comboSellingPrice(combo)) errors.push(`combo ${combo.id} giá bán ${cp.baseSellingPrice} lệch comboSellingPrice ${comboSellingPrice(combo)}`);
  }
  return errors;
}
