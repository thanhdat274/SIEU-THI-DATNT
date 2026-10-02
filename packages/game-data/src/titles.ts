import { TitleDef } from '@game/shared';
import { nullProto } from './safe-map';

export const TITLES: readonly TitleDef[] = [
  {
    id: 'title_tap_su',
    name: 'Tập Sự Đầu Hẻm',
    description: 'Chập chững mở tiệm tạp hóa nhỏ nơi ngõ phố quen thuộc.',
    category: 'level',
    icon: '🌱',
    requirement: { type: 'level', threshold: 1 },
  },
  {
    id: 'title_chu_tiem_can_man',
    name: 'Chủ Tiệm Cần Mẫn',
    description: 'Kiên trì bám trụ buôn bán qua 7 ngày mở tiệm.',
    category: 'service',
    icon: '☀️',
    requirement: { type: 'daysPassed', threshold: 7 },
  },
  {
    id: 'title_tap_nap_khach_hang',
    name: 'Góc Phố Tấp Nập',
    description: 'Phục vụ tận tâm cho hơn 30 lượt bà con chòm xóm ghé mua.',
    category: 'service',
    icon: '🛒',
    requirement: { type: 'totalCustomers', threshold: 30 },
  },
  {
    id: 'title_tiem_uy_tin',
    name: 'Tiệm Uy Tín Vàng',
    description: 'Được chòm xóm thương yêu, đạt điểm uy tín từ 20 trở lên.',
    category: 'reputation',
    icon: '⭐',
    requirement: { type: 'reputation', threshold: 20 },
  },
  {
    id: 'title_von_quay_vong',
    name: 'Tiệm Có Đồng Ra Đồng Vào',
    description: 'Tích lũy tổng doanh thu buôn bán đạt mốc 1.000.000 ₫.',
    category: 'wealth',
    icon: '💰',
    requirement: { type: 'totalRevenue', threshold: 1000000 },
  },
  {
    id: 'title_vua_don_tiec',
    name: 'Vua Đơn Tiệc Hẻm',
    description: 'Hoàn thành xuất sắc 2 đơn tiệc đình đám cho cư dân trong khu vực.',
    category: 'orders',
    icon: '🍱',
    requirement: { type: 'partyOrders', threshold: 2 },
  },
  {
    id: 'title_bac_thay_quan_ly',
    name: 'Bậc Thầy Quản Lý',
    description: 'Đưa tiệm phát triển vượt bậc, chính thức vươn tới cấp độ 10.',
    category: 'level',
    icon: '🏆',
    requirement: { type: 'level', threshold: 10 },
  },
  {
    id: 'title_dai_gia_tap_hoa',
    name: 'Đại Gia Tạp Hóa',
    description: 'Tổng doanh thu kinh doanh vượt mốc 10.000.000 ₫.',
    category: 'wealth',
    icon: '🏮',
    requirement: { type: 'totalRevenue', threshold: 10000000 },
  },
  {
    id: 'title_huyen_thoai_dau_hem',
    name: 'Huyền Thoại Đầu Hẻm',
    description: 'Biểu tượng văn hóa của cả con phố, đạt cấp độ 20.',
    category: 'level',
    icon: '👑',
    requirement: { type: 'level', threshold: 20 },
  },
];

export const TITLE_MAP: Record<string, TitleDef> = nullProto(Object.fromEntries(
  TITLES.map(title => [title.id, title])
));
