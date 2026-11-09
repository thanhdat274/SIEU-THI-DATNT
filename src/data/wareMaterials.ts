/**
 * GĐ1945 — Vật liệu nâng cấp kho (siêu thị phase 2, đóng #9 Xóm).
 *
 * Từ cấp kho thứ 5 trở lên ("Kho lạnh công nghiệp", mở cấp 50 — sau mốc vàng 30) nâng kho cần thêm
 * gạch / xi măng / thép ngoài tiền. Vật liệu để riêng ở bãi (field `wareMaterials`), KHÔNG chiếm thùng
 * kho (`storageCapacity` không đổi) và không phải món hàng bày bán (không vào catalog/PRODUCTS — giữ
 * nguyên dòng ngẫu nhiên của sim kinh tế). Mua theo bộ ở bảng Kho.
 */
export interface WareMaterials { gach: number; ximang: number; thep: number }

export const MATERIAL_KEYS = ['gach', 'ximang', 'thep'] as const;
export const MATERIAL_LABEL: Record<keyof WareMaterials, string> = { gach: '🧱 Gạch', ximang: '🪣 Xi măng', thep: '🔩 Thép' };

export const emptyWareMaterials = (): WareMaterials => ({ gach: 0, ximang: 0, thep: 0 });

/** Một bộ vật liệu mua ở bảng Kho. */
export const MATERIAL_PACK: WareMaterials = { gach: 10, ximang: 5, thep: 3 };
export const MATERIAL_PACK_PRICE = 400_000;
/** Bộ vật liệu chỉ bán khi kho đã tới cấp cần vật liệu kế tiếp (tránh tiêu tiền vô ích đầu game). */
export const MATERIAL_FROM_TIER = 4;

/** Vật liệu cần để nâng LÊN cấp kho `toTier` (chỉ số WAREHOUSE_TIERS); cấp thấp không cần. */
const NEEDS: Record<number, WareMaterials> = {
  4: { gach: 20, ximang: 10, thep: 5 },
  5: { gach: 40, ximang: 20, thep: 12 },
  6: { gach: 80, ximang: 40, thep: 25 },
};
export const materialsFor = (toTier: number): WareMaterials => NEEDS[toTier] ?? emptyWareMaterials();

/** Phần vật liệu còn thiếu (0 hết = đủ). */
export function missingMaterials(have: WareMaterials | undefined, toTier: number): WareMaterials {
  const need = materialsFor(toTier);
  const h = have ?? emptyWareMaterials();
  return { gach: Math.max(0, need.gach - h.gach), ximang: Math.max(0, need.ximang - h.ximang), thep: Math.max(0, need.thep - h.thep) };
}
export const hasMaterials = (have: WareMaterials | undefined, toTier: number) =>
  MATERIAL_KEYS.every((k) => missingMaterials(have, toTier)[k] === 0);
