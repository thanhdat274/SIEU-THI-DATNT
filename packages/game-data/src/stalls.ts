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
}

export const STALLS: readonly StallDefinition[] = [
  {
    id: 'cafe_vot', name: 'Quầy cà phê vợt', description: 'Cà phê sữa đá pha vợt ngay trước hiên tiệm. Dùng sữa đặc và đường lấy từ kho.',
    unlockLevel: 3, price: 300000, baseServings: 10, maxServings: 24, servingPrice: 15000, cashCostPerServing: 3000,
    ingredients: [{ productId: 'sua_ong_tho', perServing: 0.2 }, { productId: 'duong_cat', perServing: 0.05 }],
    tileX: 13, tileY: 12, widthTiles: 2,
  },
  {
    id: 'banh_mi_muoi_ot', name: 'Quầy bánh mì nướng muối ớt', description: 'Bánh mì nướng than phết muối ớt. Dùng bánh mì gối và dầu ăn lấy từ kho.',
    unlockLevel: 4, price: 450000, baseServings: 12, maxServings: 30, servingPrice: 12000, cashCostPerServing: 1500,
    ingredients: [{ productId: 'banh_mi_goi', perServing: 0.2 }, { productId: 'dau_an', perServing: 0.02 }],
    tileX: 17, tileY: 12, widthTiles: 2,
  },
];

export const STALL_MAP: Record<string, StallDefinition> = nullProto(Object.fromEntries(STALLS.map(stall => [stall.id, stall])));
