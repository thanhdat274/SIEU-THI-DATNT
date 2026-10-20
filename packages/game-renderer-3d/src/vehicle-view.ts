import { STREET_VEHICLE_RULES, TRUCK_KINDS } from '@game/data';
import type { StreetVehicleState } from '@game/shared';
import { isoAlpha } from './coords';

/** Mặt xe nhìn từ camera: bên phải/trái màn hình (nhìn ngang) hoặc quay mặt về/lưng với camera (nhìn trước/sau). */
export type VehicleFacing = 'left' | 'right' | 'down' | 'up';

/**
 * Hướng xe nhìn từ camera đang ở `quarter` (hệ tay phải: right = (sin α, -cos α), down = (cos α, sin α) trên mặt đất).
 * Xe chạy trục x ('right' = +X) hay trục y ('right' = +Z, xuôi nam). Quarter 0 giữ đúng bản 2D.
 */
export function vehicleFacing(axis: 'x' | 'y' | undefined, direction: 'left' | 'right', quarter: number): VehicleFacing {
  const sign = direction === 'right' ? 1 : -1;
  const mx = axis === 'y' ? 0 : sign;
  const mz = axis === 'y' ? sign : 0;
  const a = isoAlpha(quarter);
  const dotRight = mx * Math.sin(a) + mz * -Math.cos(a);
  const dotDown = mx * Math.cos(a) + mz * Math.sin(a);
  if (Math.abs(dotRight) > 0.5) return dotRight > 0 ? 'right' : 'left';
  return dotDown > 0 ? 'down' : 'up';
}

/** Khóa texture (cùng khóa với Pixi) theo loại xe và hướng nhìn. Xe máy có người lái khách dùng khung chung (không ghép nhân vật). */
export function vehicleTextureKey(v: Pick<StreetVehicleState, 'type' | 'variant'>, facing: VehicleFacing): string {
  const variant = v.variant ?? 0;
  if (facing === 'down' || facing === 'up') return `vehicle_ns_${v.type}_${variant}_${facing}`;
  switch (v.type) {
    case 'motorbike': return `vehicle_motorbike_rider_${variant}_${facing}`;
    case 'bicycle': return `vehicle_bicycle_rider_${facing}`;
    case 'minibus': return `vehicle_minibus_${variant}_${facing}`;
    case 'truck': return `truck_${TRUCK_KINDS[variant % TRUCK_KINDS.length]}_${facing}`;
    default: return variant === 0 ? `vehicle_car_${facing}` : `vehicle_car_v${variant}_${facing}`;
  }
}

/** Tọa độ y (px) chân xe: xe đường dọc có vị trí là tâm vệt bánh, đáy sprite lùi nửa chiều dài về phía nam (như Pixi). */
export function vehicleFootY(v: Pick<StreetVehicleState, 'type' | 'position' | 'axis'>): number {
  return v.axis === 'y' ? v.position.y + STREET_VEHICLE_RULES.halfLengthY[v.type] : v.position.y;
}

/** Khóa texture xe khách đỗ ở bãi. */
export function parkedVehicleKey(arrivalMode: string | undefined, variant: number | undefined): string | null {
  if (arrivalMode === 'car') return 'vehicle_car_right';
  if (arrivalMode === 'motorbike') return `vehicle_motorbike_parked_${variant ?? 0}`;
  return null;
}
