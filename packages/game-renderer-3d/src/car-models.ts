import type { StreetVehicleState, LogisticsTruckType } from '@game/shared';
import { SCALE_TARGETS } from './scale-spec';

export type CarModelKind =
  | 'car_sedan'
  | 'car_suv'
  | 'car_taxi'
  | 'car_van'
  | 'car_delivery'
  | 'car_truck'
  | 'car_ambulance'
  | 'car_police';

export interface CarModelSpec {
  url: string;
  rawLength: number;
  rawHeight: number;
  scale: number;
  targetLength: number;
  targetHeight: number;
  headlightOffset: { x: number; y: number; z: number };
  taillightOffset: { x: number; y: number; z: number };
}

export const CAR_MODELS: readonly CarModelKind[] = [
  'car_sedan',
  'car_suv',
  'car_taxi',
  'car_van',
  'car_delivery',
  'car_truck',
  'car_ambulance',
  'car_police',
] as const;

/**
 * Bảng thông số xe được tính toán tỉ lệ scale ĐỀU từ scale-spec:
 * - sedan: targetHeight = 0.75 * D = 1.20 (scale = 1.20 / 1.30 = 0.923)
 * - suv: targetHeight = 0.90 * D = 1.44 (scale = 1.44 / 1.30 = 1.108)
 * - taxi: targetHeight = 0.85 * D = 1.36 (scale = 1.36 / 1.50 = 0.907)
 * - van: targetHeight = 0.90 * D = 1.44 (scale = 1.44 / 1.35 = 1.067)
 * - delivery: targetHeight = 1.20 * D = 1.92 (scale = 1.92 / 1.65 = 1.164)
 * - truck: targetHeight = 1.20 * D = 1.92 (scale = 1.92 / 1.30 = 1.477)
 * - ambulance: targetHeight = 1.20 * D = 1.92 (scale = 1.92 / 1.80 = 1.067)
 * - police: targetHeight = 0.78 * D = 1.25 (scale = 1.25 / 1.313 = 0.952)
 */
export const CAR_CATALOG: Record<CarModelKind, CarModelSpec> = {
  car_sedan: {
    url: '/assets/models/car-kit/sedan.glb',
    rawLength: 2.55,
    rawHeight: 1.30,
    scale: SCALE_TARGETS.car.sedan.height / 1.30,
    targetLength: SCALE_TARGETS.car.sedan.length,
    targetHeight: SCALE_TARGETS.car.sedan.height,
    headlightOffset: { x: 0.35, y: 0.55, z: 1.25 },
    taillightOffset: { x: 0.35, y: 0.60, z: -1.25 },
  },
  car_suv: {
    url: '/assets/models/car-kit/suv.glb',
    rawLength: 2.70,
    rawHeight: 1.30,
    scale: SCALE_TARGETS.car.suv.height / 1.30,
    targetLength: SCALE_TARGETS.car.suv.length,
    targetHeight: SCALE_TARGETS.car.suv.height,
    headlightOffset: { x: 0.38, y: 0.60, z: 1.35 },
    taillightOffset: { x: 0.38, y: 0.65, z: -1.35 },
  },
  car_taxi: {
    url: '/assets/models/car-kit/taxi.glb',
    rawLength: 2.75,
    rawHeight: 1.50,
    scale: SCALE_TARGETS.car.taxi.height / 1.50,
    targetLength: SCALE_TARGETS.car.taxi.length,
    targetHeight: SCALE_TARGETS.car.taxi.height,
    headlightOffset: { x: 0.35, y: 0.55, z: 1.35 },
    taillightOffset: { x: 0.35, y: 0.60, z: -1.35 },
  },
  car_van: {
    url: '/assets/models/car-kit/van.glb',
    rawLength: 2.75,
    rawHeight: 1.35,
    scale: SCALE_TARGETS.car.van.height / 1.35,
    targetLength: SCALE_TARGETS.car.van.length,
    targetHeight: SCALE_TARGETS.car.van.height,
    headlightOffset: { x: 0.38, y: 0.60, z: 1.35 },
    taillightOffset: { x: 0.38, y: 0.65, z: -1.35 },
  },
  car_delivery: {
    url: '/assets/models/car-kit/delivery.glb',
    rawLength: 3.25,
    rawHeight: 1.65,
    scale: SCALE_TARGETS.car.delivery.height / 1.65,
    targetLength: SCALE_TARGETS.car.delivery.length,
    targetHeight: SCALE_TARGETS.car.delivery.height,
    headlightOffset: { x: 0.40, y: 0.60, z: 1.60 },
    taillightOffset: { x: 0.40, y: 0.65, z: -1.60 },
  },
  car_truck: {
    url: '/assets/models/car-kit/truck.glb',
    rawLength: 2.95,
    rawHeight: 1.30,
    scale: SCALE_TARGETS.car.truck.height / 1.30,
    targetLength: SCALE_TARGETS.car.truck.length,
    targetHeight: SCALE_TARGETS.car.truck.height,
    headlightOffset: { x: 0.40, y: 0.60, z: 1.45 },
    taillightOffset: { x: 0.40, y: 0.65, z: -1.45 },
  },
  car_ambulance: {
    url: '/assets/models/car-kit/ambulance.glb',
    rawLength: 3.25,
    rawHeight: 1.80,
    scale: SCALE_TARGETS.car.ambulance.height / 1.80,
    targetLength: SCALE_TARGETS.car.ambulance.length,
    targetHeight: SCALE_TARGETS.car.ambulance.height,
    headlightOffset: { x: 0.40, y: 0.60, z: 1.60 },
    taillightOffset: { x: 0.40, y: 0.65, z: -1.60 },
  },
  car_police: {
    url: '/assets/models/car-kit/police.glb',
    rawLength: 3.125,
    rawHeight: 1.313,
    scale: SCALE_TARGETS.car.police.height / 1.313,
    targetLength: SCALE_TARGETS.car.police.length,
    targetHeight: SCALE_TARGETS.car.police.height,
    headlightOffset: { x: 0.35, y: 0.55, z: 1.55 },
    taillightOffset: { x: 0.35, y: 0.60, z: -1.55 },
  },
};

export function resolveCarModelForStreetVehicle(
  type: StreetVehicleState['type'],
  variant: number
): CarModelKind {
  switch (type) {
    case 'car': {
      const v = Math.abs(variant) % 4;
      if (v === 1) return 'car_suv';
      if (v === 2) return 'car_taxi';
      if (v === 3) return 'car_police';
      return 'car_sedan';
    }
    case 'minibus': {
      return variant % 2 === 0 ? 'car_van' : 'car_ambulance';
    }
    case 'truck': {
      return variant % 2 === 0 ? 'car_truck' : 'car_delivery';
    }
    default:
      return 'car_sedan';
  }
}

export function resolveCarModelForLogisticsTruck(truckType: LogisticsTruckType): CarModelKind {
  switch (truckType) {
    case 'truck_refrigerated':
      return 'car_delivery';
    case 'truck_fresh_produce':
    case 'truck_heavy_container':
      return 'car_truck';
    case 'truck_beverage_sweets':
      return 'car_van';
    case 'truck_dry_goods':
    default:
      return 'car_delivery';
  }
}

export function vehicleYawFromMovement(
  axis: 'x' | 'y' | undefined,
  direction: 'left' | 'right'
): number {
  if (axis === 'y') {
    return direction === 'right' ? 0 : Math.PI;
  }
  return direction === 'right' ? Math.PI / 2 : -Math.PI / 2;
}

export const MOTORBIKE_COLORS = [
  '#dc2626',
  '#2563eb',
  '#1e293b',
  '#f8fafc',
  '#eab308',
  '#059669',
] as const;

export function motorbikeColorForVariant(variant: number): string {
  const idx = Math.abs(variant) % MOTORBIKE_COLORS.length;
  return MOTORBIKE_COLORS[idx];
}
