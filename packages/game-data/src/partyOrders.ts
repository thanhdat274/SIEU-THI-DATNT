import type { PartyOrderDef } from '@game/shared';
import { nullProto } from './safe-map';

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
  },
];

export const PARTY_ORDER_MAP: Record<string, PartyOrderDef> = nullProto(Object.fromEntries(
  PARTY_ORDERS.map((order) => [order.id, order])
));
