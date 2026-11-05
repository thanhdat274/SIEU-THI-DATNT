/**
 * GĐ1327 — "soi quyết định" nguồn cung ngoài: món nấu dùng nguyên liệu là hàng NGOÀI tạp hóa (đặc sản vùng mối lái,
 * nhà bà Tám, nhà hàng xóm — chuỗi sản xuất GĐ1322→1326). Cho 1 công thức bếp, nếu nguyên liệu chính là nguồn cung
 * ngoài, báo chính xác (tên nguyên liệu + nơi mua + mẻ nấu lời hơn bán thẳng) — để người chơi thấy món này CẦN nhập
 * riêng từ mối lái/hàng xóm (không có ở mối chuẩn) và biết đi đường nào để nấu. THUẦN: chỉ gộp số ghi sẵn (Nguyên
 * tắc c), không import store — co-op an toàn, không đổi kinh tế/save/seed (Luật 5). Tách file riêng để test không
 * kéo game state.
 */
import { REGION_PRODUCTS } from './regionSpecialty';
import { NEIGHBOR2_PRODUCTS, HOMEMADE_PRODUCTS } from './homemade';
import { productById } from './products';
import type { Recipe } from './recipes';

/** Nơi mua từng nguồn cung ngoài (nhãn ngắn để vừa dòng máy hẹp). */
const SOURCE: Record<string, string> = {};
for (const p of REGION_PRODUCTS) SOURCE[p.id] = 'mối lái vùng xa';
for (const p of NEIGHBOR2_PRODUCTS) SOURCE[p.id] = 'nhà bà Tám';
for (const p of HOMEMADE_PRODUCTS) SOURCE[p.id] = 'nhà hàng xóm';

export interface SupplyOutlet {
  ingredientId: string;
  name: string;
  source: string;
  /** Giá trị bán nếu nấu mẻ (outputQty × sell). */
  batchValue: number;
  /** Giá trị bán thẳng toàn bộ nguyên liệu mẻ (không nấu). */
  rawValue: number;
  /** Nấu hời hơn bán thẳng nguyên liệu (lý do nấu, khớp bất biến GĐ1322–1326). */
  beatsRaw: boolean;
}

/** Null nếu công thức không dùng nguồn cung ngoài (món từ nguyên liệu mối thường). */
export function supplyOutletOf(r: Recipe): SupplyOutlet | null {
  const main = r.inputs.find((i) => i.productId in SOURCE);
  if (!main) return null;
  const rawValue = r.inputs.reduce((s, i) => s + i.quantity * productById(i.productId).sell, 0);
  const batchValue = r.outputQty * productById(r.outputId).sell;
  return {
    ingredientId: main.productId,
    name: productById(main.productId).name,
    source: SOURCE[main.productId],
    batchValue,
    rawValue,
    beatsRaw: batchValue > rawValue,
  };
}
