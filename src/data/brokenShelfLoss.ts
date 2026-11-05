/**
 * GĐ1273 — LỠ BÁN KỆ HỎNG: kệ/tủ đang HỎNG chặn khách lấy hàng → mất DOANH THU, chứ không chỉ tốn
 * tiền sửa. maintenancePayoff (GĐ1190) đã tự nhận "chưa tính hàng lỡ bán khi kệ hỏng" — helper này
 * khép khoảng trống đó vì `customers.ts` bỏ hẳn kệ broken khỏi nơi khách có thể lấy món (`t.count>0`).
 *
 * THUẦN ĐỌC (không đổi state/save/kinh tế/seed):
 *   - Kệ broken có tầng đang bày (tiers count>0) sẽ chặn chính các món đó.
 *   - Một món chỉ bị tính là LỠ bán khi KHÔNG còn kệ nào khác (không hỏng) đang bày nó — nếu khách
 *     vẫn mua được ở chỗ khác thì không cường điệu. `workingHas` đếm món trên mọi kệ còn chạy.
 *   - Lỡ/ngày = dailyQty (sức bán thật 14 ngày, itemHealthList) × giá bán lẻ — là ƯỚC TỐI ĐA ("tới ~"),
 *     vì khách có thể đổi món. Kệ broken cũng không còn trong rủi ro sửa qua đêm (maintenancePayoff bỏ qua
 *     đồ đang hỏng) nên hai helper bổ sung nhau, không trùng số.
 */
import { furnitureDef } from './furniture';
import { productById } from './products';
import type { FurnitureType } from './furniture';
import type { ItemHealth } from './analytics';

export interface BrokenShelfLine {
  /** Tên đồ hỏng (Kệ gỗ, Tủ mát…). */
  typeName: string;
  /** Các món bị chặn hẳn (không còn kệ chạy nào khác bày). */
  itemNames: string[];
  /** Ước doanh thu lỡ của đồ này mỗi ngày (tối đa). */
  lostPerDay: number;
}

export interface BrokenShelfLoss {
  /** Có kệ hỏng đang chặn món nào không. */
  hasBroken: boolean;
  /** Từng đồ hỏng đang chặn. */
  lines: BrokenShelfLine[];
  /** Ước doanh thu lỡ mỗi ngày (TỐI ĐA, món đã gộp trùng). */
  lostPerDay: number;
}

export function brokenShelfLoss(
  furniture: { type: FurnitureType; broken?: boolean; tiers?: { productId: string | null; count: number }[] }[],
  itemHealth: ItemHealth[],
): BrokenShelfLoss {
  const health = new Map(itemHealth.map((h) => [h.id, h]));
  const workingHas = new Set<string>();
  for (const f of furniture) {
    if (f.broken) continue;
    for (const t of f.tiers ?? []) if (t.productId && t.count > 0) workingHas.add(t.productId);
  }

  const lines: BrokenShelfLine[] = [];
  const counted = new Set<string>();
  let lostPerDay = 0;
  for (const f of furniture) {
    if (!f.broken) continue;
    const itemNames: string[] = [];
    let lineLoss = 0;
    for (const t of f.tiers ?? []) {
      if (!t.productId || t.count <= 0 || workingHas.has(t.productId)) continue; // còn chỗ bán thay → không chặn hẳn
      const h = health.get(t.productId);
      if (!h) continue;
      const sell = productById(t.productId)?.sell ?? 0;
      itemNames.push(productById(t.productId)?.name ?? t.productId);
      if (!counted.has(t.productId)) { counted.add(t.productId); lostPerDay += h.dailyQty * sell; }
      lineLoss += h.dailyQty * sell;
    }
    if (itemNames.length) {
      lines.push({ typeName: furnitureDef(f.type).name, itemNames, lostPerDay: lineLoss });
    }
  }
  return { hasBroken: lines.length > 0, lines, lostPerDay };
}
