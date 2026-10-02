import { SupplierConfig } from '@game/shared';
import { nullProto } from './safe-map';

export const SUPPLIERS: SupplierConfig[] = [
  {
    id: 'dai_ly_dau_hem',
    name: 'Đại lý đầu hẻm',
    description: 'Mối quen đầu hẻm · Giao sáng ngày mai · Không ràng buộc đơn tối thiểu',
    unlockLevel: 1,
    discountRate: 0,
    minOrderValue: 0,
    delayDays: 1,
    note: 'Mối quen truyền thống, giá sỉ chuẩn, giao vào 07:00 sáng hôm sau.',
    stockPerProductPerDay: 200,
    priceVolatility: 0.02,
    outageFactor: 0, // luôn còn ít nhất một mối không ngừng cung
  },
  {
    id: 'cho_dau_moi',
    name: 'Chợ đầu mối',
    description: 'Giá sỉ chiết khấu 10% · Giao sáng hôm sau · Đơn tối thiểu 100.000 ₫',
    unlockLevel: 2,
    discountRate: 0.10,
    minOrderValue: 100000,
    delayDays: 1,
    note: 'Nhập số lượng lớn từ chợ đầu mối với mức chiết khấu 10%, yêu cầu đơn tối thiểu 100.000 ₫.',
    stockPerProductPerDay: 120,
    priceVolatility: 0.06,
    deliveryWeekdays: [0, 1, 2, 3, 4, 5], // không giao Chủ Nhật
    bulkTiers: [{ minQty: 24, discount: 0.03 }, { minQty: 60, discount: 0.06 }],
    outageFactor: 1,
  },
  {
    id: 'giao_hoa_toc',
    name: 'Đại lý Hỏa Tốc',
    description: 'Giao ngay trong ngày · Phụ phí 5% · Đơn tối thiểu 50.000 ₫',
    unlockLevel: 2,
    discountRate: -0.05,
    minOrderValue: 50000,
    delayDays: 0,
    note: 'Giao hàng hỏa tốc trong ngày để kịp bán giờ cao điểm, phụ phí dịch vụ 5%, đơn tối thiểu 50.000 ₫.',
    stockPerProductPerDay: 60,
    priceVolatility: 0.04,
    outageFactor: 0.6,
  }
];

export const DEFAULT_SUPPLIER_ID = 'dai_ly_dau_hem';

export const SUPPLIER_MAP: Record<string, SupplierConfig> = nullProto(Object.fromEntries(
  SUPPLIERS.map((s) => [s.id, s])
));
