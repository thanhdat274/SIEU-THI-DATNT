/**
 * Hệ 1 — CHIỀU SÂU "ĐẦU RA" cho sản phẩm PHƠI · MUỐI · Ủ: ngoài bán thẳng ở quầy (picklePayoff/phoiPayoff),
 * sản phẩm tự làm còn là NGUYÊN LIỆU cho các món nấu (bếp/quán xóm) — người chơi phải quyết "bán thẳng
 * hay để dành cho món X". Helper này liệt kê các món dùng sản phẩm, trạm nấu và lượng tiêu mỗi mẻ, để
 * người chơi biết đầu ra của từng mẻ phơi/muối/ủ (không hộp đen — định lý thiết kế a).
 *
 * THUẦN, tất định: chỉ đọc RECIPES + productById, không đổi state/sim/save/kinh tế → golden không đụng.
 */
import { RECIPES } from './recipes';
import { productById } from './products';

export interface DishOutlet {
  name: string;
  station: string;
  /** Lượng sản phẩm này mỗi mẻ. */
  qty: number;
}

export interface PreserveOutlet {
  productId: string;
  name: string;
  outlets: DishOutlet[];
  /** Số món nấu dùng sản phẩm này. */
  count: number;
  line: string;
}

/** Món nấu dùng `productId` làm nguyên liệu (có thể có nhiều món). */
export function preserveOutlet(productId: string): PreserveOutlet {
  const outlets: DishOutlet[] = [];
  for (const r of RECIPES) {
    const ing = r.inputs.find((i) => i.productId === productId);
    if (ing) outlets.push({ name: r.name, station: r.station, qty: ing.quantity });
  }
  const out = productById(productId);
  const line =
    outlets.length === 0
      ? `${out.name}: chưa có món nấu dùng — bán thẳng ở quầy.`
      : `${out.name}: dùng cho ${outlets.length} món — ` +
        outlets.slice(0, 3).map((o) => `${o.name} (${o.qty}/mẻ)`).join(', ') +
        (outlets.length > 3 ? `, +${outlets.length - 3} món nữa` : '');
  return { productId, name: out.name, outlets, count: outlets.length, line };
}
