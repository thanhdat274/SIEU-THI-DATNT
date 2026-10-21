import type { BuildingTypeId } from './world/building-types';

/** Hình 3D của một loại tòa (renderer Babylon, docs/plans/3d-migration-plan.md C1). Màu dạng '#rrggbb'. */
export interface BuildingVisual {
  wall: string;
  roof: string;
  /** Mái hiên mặt tiền: hai màu sọc xen kẽ. */
  awning: readonly [string, string];
  /** Biển hiệu trên cửa: nền và chữ. */
  signBg: string;
  signText: string;
  /** Chiều cao tường (ô). */
  wallHeight: number;
  /** Không có mái (công viên, bãi xe): chỉ vẽ tường rào thấp. */
  open?: boolean;
  /** Mã model 3D (tùy chọn, đối chiếu với MODEL_CATALOG của 3D renderer). */
  modelId?: string;
}

const shop = (wall: string, roof: string, awning: readonly [string, string], signBg: string, signText = '#fff8e8', modelId?: string): BuildingVisual =>
  ({ wall, roof, awning, signBg, signText, wallHeight: 1.6, ...(modelId ? { modelId } : {}) });

/** Mỗi loại tòa phải có hình (kiểu `Record` bắt thiếu khi thêm loại mới). */
export const BUILDING_VISUALS: Record<BuildingTypeId, BuildingVisual> = {
  grocery_main: shop('#efe3c6', '#b5533c', ['#c8402f', '#f3ead6'], '#2f5d3a'),
  xoi_shop: shop('#f2dfb0', '#8a5a2b', ['#e1a12a', '#fbf1d6'], '#7a3b1d'),
  drink_shop: shop('#d8ecea', '#2f7f86', ['#3a9aa2', '#f1fbfa'], '#1f4f66'),
  snack_shop: shop('#f6d9d0', '#c4563f', ['#e9774e', '#fff2e8'], '#8c2f39'),
  grocery_branch: shop('#e7e0cc', '#a24a35', ['#b9382a', '#f3ead6'], '#2f5d3a'),
  cafe: shop('#e6d6c3', '#5b3a29', ['#6e4630', '#efe2cf'], '#3a2418'),
  com_restaurant: shop('#f1e6c8', '#9b3d2e', ['#d2a03a', '#fff5dc'], '#5c1f16'),
  clinic: shop('#f4f6f2', '#4f8fb8', ['#3f7fae', '#ffffff'], '#c43a3a', '#fff8e8', 'building_civic_clinic'),
  ward_police: shop('#f0e6c0', '#a5432f', ['#c8a43a', '#fff8dc'], '#8a1f1f', '#ffe27a', 'building_civic_police'),
  primary_school: shop('#f3e2a2', '#b8452f', ['#d9b23d', '#fff6d6'], '#2d4f8a', '#fff8e8', 'building_civic_school'),
  parking_lot: { wall: '#9a9a9a', roof: '#9a9a9a', awning: ['#9a9a9a', '#9a9a9a'], signBg: '#2d5aa0', signText: '#ffffff', wallHeight: 0.4, open: true },
  park: { wall: '#7a9a5a', roof: '#7a9a5a', awning: ['#7a9a5a', '#7a9a5a'], signBg: '#3f6f2f', signText: '#ffffff', wallHeight: 0.4, open: true },
};
