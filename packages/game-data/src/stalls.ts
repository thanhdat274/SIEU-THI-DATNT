import { nullProto } from './safe-map';
export interface StallIngredient {
  productId: string; // hàng lấy từ nhà kho
  perServing: number; // đơn vị hàng cho mỗi suất (có thể lẻ, ví dụ 0.2 hộp)
}

export interface StallDefinition {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  price: number; // tiền mở quầy một lần
  baseServings: number; // nhu cầu suất/ngày ở điều kiện bình thường
  maxServings: number; // công suất tối đa/ngày
  servingPrice: number;
  cashCostPerServing: number; // nguyên liệu ngoài danh mục kho (cà phê bột, đá, than, muối ớt...) trả tiền mặt
  ingredients: StallIngredient[];
  tileX: number; // vị trí trên vỉa hè trước tiệm
  tileY: number;
  widthTiles: number;
  /** Giờ ngừng bán trong ngày (mở chung 08:00). Thiếu = bán tới 22:00. Quầy có trường này hiện biển HẾT khi ngừng bán. */
  sellUntilHour?: number;
}

/** Giờ mở và giờ đóng chung của quầy vỉa hè. */
export const STALL_OPEN_HOUR = 8;
export const STALL_CLOSE_HOUR = 22;
/** Số khung giờ bán (mỗi khung 1 giờ) của một quầy trong ngày. */
export const stallSellSlots = (stall: Pick<StallDefinition, 'sellUntilHour'>): number =>
  Math.max(1, Math.min(STALL_CLOSE_HOUR, stall.sellUntilHour ?? STALL_CLOSE_HOUR) - STALL_OPEN_HOUR);

export const STALLS: readonly StallDefinition[] = [
  {
    id: 'cafe_vot', name: 'Quầy cà phê vợt', description: 'Cà phê sữa đá pha vợt ngay trước hiên tiệm. Dùng sữa đặc và đường lấy từ kho.',
    unlockLevel: 3, price: 300000, baseServings: 16, maxServings: 36, servingPrice: 15000, cashCostPerServing: 3000,
    ingredients: [{ productId: 'sua_ong_tho', perServing: 0.2 }, { productId: 'duong_cat', perServing: 0.05 }],
    tileX: 13, tileY: 12, widthTiles: 2,
  },
  {
    id: 'banh_mi_muoi_ot', name: 'Quầy bánh mì nướng muối ớt', description: 'Bánh mì nướng than phết muối ớt. Dùng bánh mì gối và dầu ăn lấy từ kho.',
    unlockLevel: 4, price: 450000, baseServings: 18, maxServings: 45, servingPrice: 12000, cashCostPerServing: 1500,
    ingredients: [{ productId: 'banh_mi_goi', perServing: 0.2 }, { productId: 'dau_an', perServing: 0.02 }],
    tileX: 17, tileY: 12, widthTiles: 2,
  },
  {
    // Đại lý vé số: không nguyên liệu kho, vốn là tiền nhập vé; lãi là hoa hồng ~12%. Số liệu provisional, chưa playtest.
    id: 've_so', name: 'Quầy vé số', description: 'Bán vé số dạo ở góc vỉa hè, lãi theo hoa hồng đại lý. Bán tới 17:00 là hết vé.',
    unlockLevel: 6, price: 250000, baseServings: 60, maxServings: 100, servingPrice: 10000, cashCostPerServing: 8800,
    ingredients: [], sellUntilHour: 17,
    tileX: 20, tileY: 12, widthTiles: 2,
  },
];

export const STALL_MAP: Record<string, StallDefinition> = nullProto(Object.fromEntries(STALLS.map(stall => [stall.id, stall])));
