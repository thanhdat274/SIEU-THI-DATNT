import { Color3 } from '@babylonjs/core/Maths/math.color';
import { STORE_FRONT_CROSSWALK, type IntersectionDef } from '@game/data';
import { TILE_SIZE, type TrafficLightColor, type PedestrianSignal } from '@game/shared';

export const SIGNAL_OFF = 0x2a2f2c;
export const SIGNAL_RED = 0xe0533f;
export const SIGNAL_YELLOW = 0xf2c74a;
export const SIGNAL_GREEN = 0x5fd17a;

export function hexToColor3(hex: number): Color3 {
  return new Color3(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}

/** Màu bóng đèn tín hiệu xe: đỏ, vàng, xanh. */
export function vehicleLampColors(color: TrafficLightColor | undefined): { red: number; yellow: number; green: number } {
  return {
    red: color === 'red' ? SIGNAL_RED : SIGNAL_OFF,
    yellow: color === 'yellow' ? SIGNAL_YELLOW : SIGNAL_OFF,
    green: color === 'green' ? SIGNAL_GREEN : SIGNAL_OFF,
  };
}

/** Màu bóng đèn tín hiệu người đi bộ: đỏ (dừng), xanh (đi). */
export function pedestrianLampColors(ped: PedestrianSignal | undefined, blinkOn: boolean): { stop: number; walk: number } {
  const stopOn = ped === 'dont_walk' || (ped === 'clearing' && blinkOn);
  return {
    stop: stopOn ? SIGNAL_RED : SIGNAL_OFF,
    walk: ped === 'walk' ? SIGNAL_GREEN : SIGNAL_OFF,
  };
}

/** Tọa độ pixel chân 4 cột đèn tại một ngã tư. */
export function intersectionPolePixelPositions(
  x: Pick<IntersectionDef, 'id' | 'crossLeft' | 'crossRight' | 'roadBottom'>,
  roadTopRow: number,
): Array<{ id: string; onMain: boolean; x: number; y: number }> {
  const top = (roadTopRow - 1) * TILE_SIZE + 28;
  const bottom = x.roadBottom + 24;
  const west = x.crossLeft + 16;
  const east = x.crossRight - 16;
  return [
    { id: x.id, onMain: true, x: west, y: bottom },  // góc TN: đón xe đi sang đông
    { id: x.id, onMain: true, x: east, y: top },     // góc ĐB: đón xe đi sang tây
    { id: x.id, onMain: false, x: west, y: top },    // góc TB: đón xe xuôi nam
    { id: x.id, onMain: false, x: east, y: bottom }, // góc ĐN: đón xe ngược bắc
  ];
}

export interface GroundRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
}

/** Quy đổi các vạch qua đường trước tiệm thành danh sách hình chữ nhật thế giới 3D. */
export function crosswalkBarRects(cw = STORE_FRONT_CROSSWALK): GroundRect[] {
  const barH = 5; // px
  const gap = 7; // px
  let by = cw.nearY + 3;
  const rects: GroundRect[] = [];
  while (by + barH <= cw.farY) {
    const px0 = cw.x0;
    const px1 = cw.x1;
    const py0 = by;
    const py1 = by + barH;

    const x0 = px0 / TILE_SIZE;
    const x1 = px1 / TILE_SIZE;
    const z0 = py0 / TILE_SIZE;
    const z1 = py1 / TILE_SIZE;

    rects.push({
      x0,
      z0,
      x1,
      z1,
      width: x1 - x0,
      depth: z1 - z0,
      centerX: (x0 + x1) / 2,
      centerZ: (z0 + z1) / 2,
    });
    by += barH + gap;
  }
  return rects;
}

/** Tọa độ cột đèn người đi bộ trước cửa tiệm. */
export function storeFrontPolePixel(cw = STORE_FRONT_CROSSWALK): { x: number; y: number } {
  return {
    x: cw.x1 - 22,
    y: cw.farY + 6,
  };
}
