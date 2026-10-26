import { productById } from './products';

/**
 * Quầy thịt cá tươi: hàng tươi sống hỏng nhanh (hạn 2 ngày, phải để trong quầy mát), cần giấy phép an toàn
 * thực phẩm và người bán thịt cá đứng quầy — không có người cân cắt thì khách ít mua.
 * Chỉ có dữ liệu và hàm thuần; áp vào khách ở `agents/customers`.
 */
export const MEAT_UNLOCK = 32;

export const isMeat = (productId: string) => productById(productId).category === 'meat';

/** Không có người bán thịt cá trực ca: khách chỉ còn chừng này phần sẵn lòng mua thịt cá. */
export const NO_BUTCHER_DEMAND = 0.35;
/** Mỗi sao tay nghề người bán thịt cá làm khách mua thịt cá nhiều thêm chừng này. */
export const BUTCHER_DEMAND_PER_STAR = 0.12;

/** Hệ số khách chọn món `productId` khi tay nghề người bán thịt cá đang trực là `butcherSkill` (0 = không ai). */
export function meatDemandFactor(productId: string, butcherSkill: number): number {
  if (!isMeat(productId)) return 1;
  return butcherSkill <= 0 ? NO_BUTCHER_DEMAND : 1 + BUTCHER_DEMAND_PER_STAR * butcherSkill;
}
