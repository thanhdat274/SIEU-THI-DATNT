/**
 * GĐ143 "Mối nào rẻ THẬT": đóng nửa GIỮA còn là hộp đen của vòng nhập hàng — quyết định CHỌN MỐI.
 * Nhập hàng đã có nửa TRƯỚC (orderAssessment GĐ103 giỏ; expiringSoon/nearExpiry hạn) và nửa SAU
 * (storeMissRevenue GĐ131, spoilNightReport GĐ133), nhưng "mua ở mối nào" chỉ có:
 *   - tone giá từng mối (buyCostTone GĐ57) + cheapestSupplier so TỔNG giỏ (procure.ts)
 *   - banner "Mối quen" tháng (supplierRel) — bộ đếm THỤ ĐỘNG ("đã mua X, còn Y đạt cam kết, sẽ hoàn Z%")
 * KHÔNG nơi nào quy ra ĐƠN GIÁ RÒNG sau hoàn tiền, cũng không "từng MÓN trong giỏ mối nào rẻ nhất HÔM NAY".
 * File này: helper THUẦN ĐỌC — chỉ đọc hằng số + helper nguồn (unitCost/bulkDiscount/orderTotal,
 * monthlyRelRebate/relTier) và tính lại ĐÚNG công thức có sẵn, KHÔNG đổi giá/kinh tế/state/SAVE_VERSION.
 */

import { bulkDiscount, SUPPLIERS, supplierSells, unitCost, type Supplier } from './suppliers';
import { casesFor } from './products';
import { monthlyRelRebate, relTier, type PartnerTier } from './supplierRel';

/** Đơn giá hiệu lực (sau bớt số lượng lớn) của một món ở một mối, cho đơn đang đặt `qty` món. */
export function effectiveUnitCost(s: Supplier, productId: string, qty: number, day: number): number {
  const cases = casesFor(productId, qty);
  return Math.round(unitCost(s, productId, day) * (1 - bulkDiscount(s, cases)));
}

export interface CheapestProductResult {
  /** Mối mở khóa khác MỐI ĐANG CHỌN (`excludeId`) bán được món này, có đơn giá hiệu lực rẻ nhất. */
  supplier: Supplier;
  /** Đơn giá hiệu lực (sau bulk) của mối rẻ nhất đó. */
  unit: number;
  /** Rẻ hơn mối đang chọn bao nhiêu MỘT món (dương khi rẻ hơn; âm khi đắt hơn; 0 = không khả dụng). */
  delta: number;
}

/**
 * Mối mở khóa khác `excludeId` bán được `productId` có đơn giá hiệu lực rẻ nhất hôm nay,
 * so với `curUnit` (đơn giá hiệu lực của mối đang chọn) — để đánh dấu "món này nên xẻ sang mối khác".
 * Giá mỗi mối so theo ĐƠN GIÁ HIỆU LỰC (gồm bulk theo qty) để đúng 1:1 với số tiền người chơi trả.
 * Không có mối khác khả dụng (chưa mở / mối đó không bán ngành) → null.
 */
export function cheapestSupplierFor(
  productId: string,
  qty: number,
  day: number,
  level: number,
  excludeId: string,
  curUnit: number | null
): CheapestProductResult | null {
  let best: Supplier | null = null;
  let bestUnit = Infinity;
  for (const s of SUPPLIERS) {
    if (s.id === excludeId) continue;
    if (s.unlock > level) continue;
    if (!supplierSells(s, productId)) continue;
    const u = effectiveUnitCost(s, productId, qty, day);
    if (u < bestUnit) {
      bestUnit = u;
      best = s;
    }
  }
  if (!best) return null;
  const cur = curUnit ?? effectiveUnitCost(supplierByIdSafe(excludeId), productId, qty, day);
  return { supplier: best, unit: bestUnit, delta: Math.round(cur - bestUnit) };
}

// tránh export lại supplierById gây cycle; chỉ cần lookup nội bộ cho curUnit mặc định
function supplierByIdSafe(id: string): Supplier {
  return SUPPLIERS.find((s) => s.id === id)!;
}

/**
 * Gợi ý "gom cam kết tháng" cho MỐI ĐANG CHỌN: với hồ sơ quan hệ `life`, doanh tháng `monthSpent`
 * và giỏ đang đặt `cartTotal`, đơn này đẩy được doanh tháng của mối tới đâu so với cam kết, và
 * nếu đạt cam kết tháng thì cuối tháng hoàn bao nhiêu (đúng công thức `monthlyRelRebate`).
 * Trả verdict khả dụng chỉ khi mối ở bậc ≥1 (mới đủ điều kiện hoàn). Mọi con số đều là ƯỚC TÍNH
 * từ doanh tháng hiện tại + giỏ này — người chơi còn có thể đặt đơn sau nên đây là mồi, không phải hứa hẹn.
 */
export interface CommitAdvice {
  tier: PartnerTier;
  /* Doanh tháng sau khi cộng giỏ này. */
  projectedSpent: number;
  /* Còn thiếu bao nhiêu để đạt cam kết tháng (0 nếu đã đạt). */
  gapAfter: number;
  /* Hoàn cuối tháng NẾU tháng kết thúc với `projectedSpent` doanh (đúng formula, kể cả khi chưa đủ cam kết → 0). */
  rebateIf: number;
  /* Hoàn dự kiến ở mức `monthSpent` hiện tại (không cộng giỏ) — để biết giỏ này THÊM được bao nhiêu. */
  rebateBase: number;
  /* Chỉ đủ bậc hoàn (tier.level >= 1) → có verdict cho mối này. */
  eligible: boolean;
}

export function commitRebateAdvice(
  life: number,
  monthSpent: number,
  cartTotal: number
): CommitAdvice {
  const tier = relTier(life);
  const projectedSpent = monthSpent + cartTotal;
  const rebateBase = monthlyRelRebate(life, monthSpent);
  const rebateIf = monthlyRelRebate(life, projectedSpent);
  return {
    tier,
    projectedSpent,
    gapAfter: tier.level > 0 ? Math.max(0, tier.commit - projectedSpent) : 0,
    rebateIf,
    rebateBase,
    eligible: tier.level > 0,
  };
}

export type { Supplier, PartnerTier };
