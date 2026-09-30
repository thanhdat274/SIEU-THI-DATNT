export interface StallDefinition {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  price: number; // tiền mở quầy một lần
  baseServings: number; // suất bán/ngày ở nhu cầu bình thường
  maxServings: number; // công suất tối đa/ngày
  servingPrice: number;
  servingCost: number; // nguyên liệu mỗi suất (giá vốn)
}

export const STALLS: readonly StallDefinition[] = [
  { id: 'cafe_vot', name: 'Quầy cà phê vợt', description: 'Cà phê sữa đá pha vợt ngay trước hiên tiệm.', unlockLevel: 3, price: 300000, baseServings: 10, maxServings: 24, servingPrice: 15000, servingCost: 6000 },
  { id: 'banh_mi_muoi_ot', name: 'Quầy bánh mì nướng muối ớt', description: 'Bánh mì nướng than phết muối ớt cho học sinh và dân xóm.', unlockLevel: 4, price: 450000, baseServings: 12, maxServings: 30, servingPrice: 12000, servingCost: 4500 },
];

export const STALL_MAP: Record<string, StallDefinition> = Object.fromEntries(STALLS.map(stall => [stall.id, stall]));
