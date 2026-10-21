import { STREET_VEHICLE_RULES } from '@game/data';
import type { StreetVehicleState } from '@game/shared';

/** Tọa độ y (px) chân xe: xe đường dọc có vị trí là tâm vệt bánh, đáy sprite lùi nửa chiều dài về phía nam (như Pixi). */
export function vehicleFootY(v: Pick<StreetVehicleState, 'type' | 'position' | 'axis'>): number {
  return v.axis === 'y' ? v.position.y + STREET_VEHICLE_RULES.halfLengthY[v.type] : v.position.y;
}
