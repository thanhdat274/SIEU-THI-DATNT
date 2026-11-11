/**
 * GĐ1945 — Vật liệu nâng cấp kho (siêu thị phase 2, đóng #9 Xóm).
 *
 * Từ cấp kho thứ 5 trở lên ("Kho lạnh công nghiệp", mở cấp 50 — sau mốc vàng 30) nâng kho cần thêm
 * gạch / xi măng / thép ngoài tiền. Vật liệu để riêng ở bãi (field `wareMaterials`), KHÔNG chiếm thùng
 * kho (`storageCapacity` không đổi) và không phải món hàng bày bán (không vào catalog/PRODUCTS — giữ
 * nguyên dòng ngẫu nhiên của sim kinh tế). Mua đúng phần thiếu ở bảng Kho (GĐ1947).
 */
export interface WareMaterials { gach: number; ximang: number; thep: number }

export const MATERIAL_KEYS = ['gach', 'ximang', 'thep'] as const;
export const MATERIAL_LABEL: Record<keyof WareMaterials, string> = { gach: '🧱 Gạch', ximang: '🪣 Xi măng', thep: '🔩 Thép' };

export const emptyWareMaterials = (): WareMaterials => ({ gach: 0, ximang: 0, thep: 0 });

/** GĐ1947 — đơn giá từng vật liệu (thay bộ cố định 10/5/3 = 400k của GĐ1945: cùng mặt bằng giá). */
export const MATERIAL_UNIT_PRICE: WareMaterials = { gach: 10_000, ximang: 30_000, thep: 50_000 };
/** Tiền mua đúng phần còn thiếu (không mua thừa thép như bộ cố định). */
export const costOfMaterials = (m: WareMaterials) => MATERIAL_KEYS.reduce((t, k) => t + m[k] * MATERIAL_UNIT_PRICE[k], 0);
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

/** GĐ1957 — nhãn nút nâng kho: thiếu vật liệu thì nói rõ thay vì nút xám câm (null = không vướng vật liệu). */
export function materialBlockLabel(have: WareMaterials | undefined, toTier: number): string | null {
  const miss = missingMaterials(have, toTier);
  const parts = MATERIAL_KEYS.filter((k) => miss[k] > 0).map((k) => `${miss[k]} ${MATERIAL_LABEL[k].split(' ').slice(1).join(' ').toLowerCase()}`);
  return parts.length ? `Thiếu ${parts.join(', ')}` : null;
}
