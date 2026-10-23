import { productById } from './products';

/**
 * Khách sỉ / đơn buôn số lượng lớn (hợp đồng cung cấp dài hạn, có hợp đồng giá).
 * Khách đặt số lượng lớn theo chu kỳ định kỳ; giá mua lại THẤP HƠN giá gợi ý (pricePerUnit < 1)
 * nhưng bù lại số lượng nhiều và đều đặn.
 */
export interface SupplyContract {
  id: string;
  icon: string;
  title: string;
  /** Người/quán đặt (khớp tên khách quen cho có hồn). */
  from: string;
  description: string;
  unlock: number;
  /** Chu kỳ giao hàng định kỳ (VD 3 ngày một lần). */
  periodDays: number;
  /** Sản phẩm cần giao mỗi kỳ. */
  items: Record<string, number>;
  /** Hệ số giá mua lại — giá sỉ THẤP HƠN giá gợi ý một chút (VD 0.9 = 90% giá gợi ý). */
  pricePerUnit: number;
  xp: number;
}

export const SUPPLY_CONTRACTS: SupplyContract[] = [
  {
    id: 'quan_nhau', icon: '🍻', title: 'Quán nhậu cuối hẻm', from: 'Anh Minh', unlock: 14, periodDays: 3,
    description: 'Tối nào cũng đông khách nhậu, đặt bia với nước ngọt và đồ nhấm cho cả tuần.',
    items: { bia: 12, ngot: 10, nuoc: 8, snack: 10 }, pricePerUnit: 0.9, xp: 120,
  },
  {
    id: 'xuong_go', icon: '🪵', title: 'Xưởng gỗ bên sông', from: 'Chú Ba', unlock: 22, periodDays: 5,
    description: 'Thợ xưởng gỗ làm suốt ca, cần gạo, dầu ăn và mì cho bếp ăn tập thể.',
    items: { gao: 3, dauan: 4, mi: 20, nuocmam: 3 }, pricePerUnit: 0.88, xp: 150,
  },
  {
    id: 'bep_an_cong_nhan', icon: '🍲', title: 'Bếp ăn công nhân', from: 'Chị Lan', unlock: 30, periodDays: 4,
    description: 'Nhà máy may đầu khu phục vụ hàng trăm công nhân, đặt tươi sống hằng kỳ.',
    items: { gao: 5, rau: 20, thit: 8, ca: 6 }, pricePerUnit: 0.9, xp: 200,
  },
  {
    id: 'quan_ca_phe', icon: '☕', title: 'Quán cà phê đầu ngõ', from: 'Bà Ba', unlock: 38, periodDays: 3,
    description: 'Quán cà phê cóc đông khách, đặt sữa, cà phê và đồ bán kèm.',
    items: { caphe: 8, sua: 15, sua_tuoi: 6, xucxich: 10 }, pricePerUnit: 0.9, xp: 180,
  },
  {
    id: 'cho_gia_vi', icon: '🌶️', title: 'Chợ gia vị tỉnh', from: 'Bác Tám', unlock: 46, periodDays: 7,
    description: 'Tiểu thương bán buôn gom gia vị, nước mắm về bỏ mối cho các quán ăn nhỏ.',
    items: { giavi: 15, nuocmam: 8, dauan: 6, pho: 20 }, pricePerUnit: 0.87, xp: 240,
  },
  {
    id: 'cua_hang_banh', icon: '🥐', title: 'Cửa hàng bánh bông lan', from: 'Bà Năm', unlock: 55, periodDays: 3,
    description: 'Lò bánh mới mở cần trứng, dầu ăn, sữa và bánh mì để làm bánh giao cho các quán.',
    items: { trung: 15, dauan: 6, sua_tuoi: 10, banhmi: 12, tra: 8 }, pricePerUnit: 0.86, xp: 300,
  },
];

export const supplyContractById = (id: string) => SUPPLY_CONTRACTS.find((c) => c.id === id);

/** Tổng tiền một kỳ = tổng (giá bán gợi ý của món * số lượng) * pricePerUnit. */
export function contractValue(def: SupplyContract) {
  return Object.entries(def.items).reduce((n, [id, q]) => n + productById(id).sell * q, 0) * def.pricePerUnit;
}

/** Hợp đồng đã mở khóa theo cấp tiệm. */
export function activeContractsFor(level: number) {
  return SUPPLY_CONTRACTS.filter((c) => c.unlock <= level);
}

/** Thiếu những món nào trong kho để giao kỳ này. */
export function missingForContract(def: SupplyContract, storage: Record<string, number>) {
  return Object.entries(def.items).filter(([id, q]) => (storage[id] ?? 0) < q).map(([id, q]) => ({ id, need: q - (storage[id] ?? 0) }));
}
