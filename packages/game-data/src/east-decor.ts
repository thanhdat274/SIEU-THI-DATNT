import { nullProto } from './safe-map';

/**
 * Trang trí ngoài trời phía đông (khu vực quán nước).
 * Bao gồm: cột đèn, biển quảng cáo, cây cảnh, bàn ghế...
 * Dạng pixel art 2.5D, render cùng hệ thống với bản đồ.
 */

export type EastDecorType = 'street_lamp' | 'signboard' | 'plant_pots' | 'benches' | 'lanterns' | 'billboard';

export interface EastDecorDef {
  id: EastDecorType;
  tileX: number; // Cột x trên bản đồ (y luôn = 11 hoặc 12 - vỉa hè)
  y: number;     // Hàng y (11 = mép đường, 12 = lòng đường)
  widthTiles: number; // Chiều rộng (ô)
  heightTiles: number; // Chiều cao (ô)
  icon: string;  // Icon hiển thị
  name: string;  // Tên tiếng Việt
  cost: number;  // Giá mua (0 = miễn phí, trang trí mặc định)
  unlockLevel: number; // Cấp độ mở khóa
  description: string;
}

/** Trang trí cố định miễn phí (có sẵn từ đầu). */
export const FREE_EAST_DECOR: EastDecorDef[] = [
  // Cột đèn đường phía đông
  {
    id: 'street_lamp',
    tileX: 19,
    y: 11,
    widthTiles: 1,
    heightTiles: 1,
    icon: '🔆',
    name: 'Đèn đường',
    cost: 0,
    unlockLevel: 1,
    description: 'Cột đèn chiếu sáng vỉa hè phía đông, giúp khách đi bộ ban đêm dễ nhìn.',
  },
  {
    id: 'street_lamp',
    tileX: 33,
    y: 11,
    widthTiles: 1,
    heightTiles: 1,
    icon: '🔆',
    name: 'Đèn đường',
    cost: 0,
    unlockLevel: 1,
    description: 'Cột đèn chiếu sáng vỉa hè phía đông, giúp khách đi bộ ban đêm dễ nhìn.',
  },
  // Chậu cây cảnh
  {
    id: 'plant_pots',
    tileX: 27,
    y: 11,
    widthTiles: 1,
    heightTiles: 1,
    icon: '🪴',
    name: 'Chậu cây cảnh',
    cost: 0,
    unlockLevel: 1,
    description: 'Chậu cây xanh trang trí trước quán nước.',
  },
  {
    id: 'plant_pots',
    tileX: 35,
    y: 11,
    widthTiles: 1,
    heightTiles: 1,
    icon: '🪴',
    name: 'Chậu cây cảnh',
    cost: 0,
    unlockLevel: 1,
    description: 'Chậu cây xanh trang trí trước quán nước.',
  },
];

/** Trang trí mua được (phí chi phí). */
export const BUYABLE_EAST_DECOR: EastDecorDef[] = [
  // Biển quảng cáo lớn
  {
    id: 'signboard',
    tileX: 29,
    y: 9,
    widthTiles: 3,
    heightTiles: 1,
    icon: '🪧',
    name: 'Biển quảng cáo quán nước',
    cost: 80_000,
    unlockLevel: 5,
    description: 'Biển hiệu lớn cho quán nước, thu hút khách từ xa.',
  },
  // Bàn ghế nghỉ
  {
    id: 'benches',
    tileX: 26,
    y: 11,
    widthTiles: 2,
    heightTiles: 1,
    icon: '🪑',
    name: 'Bàn ghế nghỉ',
    cost: 50_000,
    unlockLevel: 5,
    description: 'Bàn ghế gỗ cho khách ngồi nghỉ, uống nước.',
  },
  // Đèn lồng
  {
    id: 'lanterns',
    tileX: 30,
    y: 8,
    widthTiles: 2,
    heightTiles: 1,
    icon: '🏮',
    name: 'Đèn lồng đỏ',
    cost: 35_000,
    unlockLevel: 5,
    description: 'Đèn lồng đỏ treo hiên quán nước, tạo không gian ấm cúng.',
  },
  // Bảng menu
  {
    id: 'billboard',
    tileX: 28,
    y: 9,
    widthTiles: 2,
    heightTiles: 1,
    icon: '📋',
    name: 'Bảng menu quán nước',
    cost: 25_000,
    unlockLevel: 5,
    description: 'Bảng thực đơn các món nước, giúp khách dễ chọn.',
  },
];

export const ALL_EAST_DECOR: EastDecorDef[] = [...FREE_EAST_DECOR, ...BUYABLE_EAST_DECOR];
export const EAST_DECOR_MAP: Record<string, EastDecorDef> = nullProto(Object.fromEntries(ALL_EAST_DECOR.map(item => [item.id, item])));
