import type { PartyOrderDef } from '@game/shared';
import { nullProto } from './safe-map';
import { SEASON_EVENTS } from './seasons';
import { PRODUCT_MAP } from './products';

export const PARTY_ORDERS: readonly PartyOrderDef[] = [
  {
    id: 'party_thoi_noi',
    title: 'Tiệc thôi nôi Bé Bắp',
    customerName: 'Chị Lan Văn Phòng',
    description: 'Chị Lan chuẩn bị tiệc thôi nôi cho con gái ở đầu hẻm, cần sữa đặc làm bánh flan và nước ngọt cho khách.',
    minPlayerLevel: 1,
    durationDays: 2,
    items: [
      { productId: 'sua_ong_tho', quantity: 4 },
      { productId: 'xa_xi_chuong_duong', quantity: 6 },
    ],
    reward: {
      money: 135000,
      reputation: 3,
      experience: 50,
    },
  },
  {
    id: 'party_sinh_nhat_tre_con',
    title: 'Sinh nhật xóm nhỏ của Bé Na',
    customerName: 'Bé Na Học Sinh',
    description: 'Sinh nhật Bé Na cùng nhóm bạn tiểu học trong xóm, cần nhiều kẹo cao su và bánh mì ăn nhẹ.',
    minPlayerLevel: 1,
    durationDays: 2,
    items: [
      { productId: 'keo_big_babol', quantity: 15 },
      { productId: 'banh_mi_que', quantity: 8 },
    ],
    reward: {
      money: 110000,
      reputation: 3,
      experience: 45,
    },
  },
  {
    id: 'party_bong_da_dem',
    title: 'Xem bóng đá đêm hẻm',
    customerName: 'Chú Ba Xe Ôm',
    description: 'Tối nay có trận chung kết đội tuyển Việt Nam! Mấy anh em tài xế xe ôm tụ tập xem bóng đá, cần mì gói ăn khuya và xá xị giải khát.',
    minPlayerLevel: 2,
    durationDays: 1,
    items: [
      { productId: 'mi_hao_hao', quantity: 12 },
      { productId: 'xa_xi_chuong_duong', quantity: 8 },
    ],
    reward: {
      money: 150000,
      reputation: 4,
      experience: 60,
    },
  },
  {
    id: 'party_mung_tho',
    title: 'Lễ mừng thọ Bác Tám',
    customerName: 'Bà Năm Bán Xôi',
    description: 'Bà con lối xóm chung tay làm lễ mừng thọ cho Bác Tám Tổ Trưởng, cần gạo thơm, trứng gà và dầu ăn nấu cỗ chay.',
    minPlayerLevel: 3,
    durationDays: 3,
    items: [
      { productId: 'gao', quantity: 5 },
      { productId: 'trung_ga', quantity: 10 },
      { productId: 'dau_an', quantity: 3 },
    ],
    reward: {
      money: 320000,
      reputation: 6,
      experience: 120,
    },
  },
  {
    id: 'party_tat_nien_xom',
    title: 'Tất niên xóm Cây Me',
    customerName: 'Bác Tám Tổ Trưởng',
    description: 'Bữa cơm tất niên toàn khu phố, cần đầy đủ gia vị, mì gói, nước mắm ngon và nước ngọt cho các bàn tiệc.',
    minPlayerLevel: 4,
    durationDays: 3,
    items: [
      { productId: 'nuoc_mam', quantity: 5 },
      { productId: 'mi_hao_hao', quantity: 20 },
      { productId: 'xa_xi_chuong_duong', quantity: 12 },
    ],
    reward: {
      money: 450000,
      reputation: 8,
      experience: 180,
    },
    seasons: ['tet'],
  },
  {
    id: 'party_sam_tet',
    title: 'Sắm Tết cả xóm',
    customerName: 'Bác Tám Tổ Trưởng',
    description: 'Đầu năm bà con rủ nhau sắm Tết sớm: bánh chưng, dưa hấu khắc chữ và câu đối đỏ trưng bàn thờ.',
    minPlayerLevel: 1,
    durationDays: 2,
    items: [
      { productId: 'banh_chung_tet', quantity: 6 },
      { productId: 'dua_hau_tet', quantity: 4 },
      { productId: 'cau_doi_do', quantity: 2 },
    ],
    reward: {
      money: 280000,
      reputation: 6,
      experience: 110,
    },
    seasons: ['tet'],
  },
  {
    id: 'party_trung_thu_pha_co',
    title: 'Đêm rằm phá cỗ',
    customerName: 'Bé Na Học Sinh',
    description: 'Lũ nhỏ trong xóm rước đèn phá cỗ đêm Trung thu, cần bánh trung thu thập cẩm và kẹo chia phần.',
    minPlayerLevel: 1,
    durationDays: 2,
    items: [
      { productId: 'banh_trung_thu', quantity: 8 },
      { productId: 'keo_big_babol', quantity: 20 },
    ],
    reward: {
      money: 250000,
      reputation: 6,
      experience: 100,
    },
    seasons: ['trung_thu'],
  },
];

/** Kiểm định nghĩa đơn tiệc: món phải có thật & mở khóa kịp cấp mở đơn; nhãn mùa phải là mùa hợp lệ. */
export function validatePartyOrders(): string[] {
  const errors: string[] = [];
  const seasonIds = new Set<string>(SEASON_EVENTS.map((s) => s.id));
  for (const def of PARTY_ORDERS) {
    for (const item of def.items) {
      const product = PRODUCT_MAP[item.productId];
      if (!product) {
        errors.push(`${def.id}: sản phẩm ${item.productId} không tồn tại`);
      } else if (product.unlockLevel > def.minPlayerLevel) {
        errors.push(`${def.id}: ${item.productId} mở khóa cấp ${product.unlockLevel} > cấp mở đơn ${def.minPlayerLevel}`);
      }
    }
    for (const season of def.seasons ?? []) {
      if (!seasonIds.has(season)) {
        errors.push(`${def.id}: mùa "${season}" không hợp lệ`);
      }
    }
  }
  return errors;
}

export const PARTY_ORDER_MAP: Record<string, PartyOrderDef> = nullProto(Object.fromEntries(
  PARTY_ORDERS.map((order) => [order.id, order])
));
