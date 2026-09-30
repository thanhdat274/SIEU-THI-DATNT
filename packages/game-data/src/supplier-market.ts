import { SUPPLIERS } from './suppliers';

/** Luật thị trường nhà cung cấp, cấu hình bằng dữ liệu. */
export const SUPPLIER_MARKET_RULES = {
  /** Hệ số giá sỉ đổi tối đa mỗi ngày (4%). */
  maxStepPerDay: 0.04,
  /** Hệ số giá sỉ theo nhóm luôn nằm trong dải này so với giá nhập chuẩn. */
  indexBounds: { min: 0.85, max: 1.6 },
  /** Số lý do chính hiển thị cho mỗi nhóm. */
  reasonsShown: 2,
  /** Tồn tối thiểu còn đặt được khi tồn bị nhân xuống rất thấp (trừ khi ngừng cung). */
  minStockWhenOpen: 1,
} as const;

export function validateSupplierData(): string[] {
  const errors: string[] = [];
  for (const supplier of SUPPLIERS) {
    if (supplier.stockPerProductPerDay !== undefined && !(supplier.stockPerProductPerDay > 0)) errors.push(`supplier ${supplier.id}: tồn mỗi ngày phải > 0`);
    if (supplier.priceVolatility !== undefined && !(supplier.priceVolatility >= 0 && supplier.priceVolatility <= 0.3)) errors.push(`supplier ${supplier.id}: biên độ giá ngoài [0, 0.3]`);
    if (supplier.outageFactor !== undefined && !(supplier.outageFactor >= 0 && supplier.outageFactor <= 2)) errors.push(`supplier ${supplier.id}: outageFactor ngoài [0, 2]`);
    if (supplier.deliveryWeekdays && (!supplier.deliveryWeekdays.length || supplier.deliveryWeekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6))) errors.push(`supplier ${supplier.id}: lịch giao không hợp lệ`);
    let previousQty = 0;
    for (const tier of supplier.bulkTiers ?? []) {
      if (tier.minQty <= previousQty) errors.push(`supplier ${supplier.id}: bậc số lượng lớn phải tăng dần`);
      if (!(tier.discount > 0 && tier.discount < 0.5)) errors.push(`supplier ${supplier.id}: ưu đãi bậc ${tier.minQty} ngoài (0, 0.5)`);
      previousQty = tier.minQty;
    }
  }
  if (!SUPPLIERS.some(supplier => supplier.outageFactor === 0)) errors.push('phải có ít nhất một nhà cung cấp không bao giờ ngừng cung (outageFactor = 0)');
  return errors;
}
