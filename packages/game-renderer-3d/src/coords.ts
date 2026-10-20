import { TILE_SIZE, type Direction } from '@game/shared';

/** Quy ước 3D: 1 ô = 1 đơn vị; cột ô → trục X, hàng ô → trục Z, Y hướng lên. Tâm ô (x, y) nằm ở (x + 0.5, y + 0.5). */
export function tileCenter(tileX: number, tileY: number): { x: number; z: number } {
  return { x: tileX + 0.5, z: tileY + 0.5 };
}

/** Vị trí pixel của mô phỏng (Pixi, TILE_SIZE px/ô) → toạ độ thế giới 3D. */
export function pixelToWorld(px: number, py: number): { x: number; z: number } {
  return { x: px / TILE_SIZE, z: py / TILE_SIZE };
}

/** Toạ độ thế giới 3D → ô chứa nó. */
export function worldToTile(x: number, z: number): { x: number; y: number } {
  return { x: Math.floor(x), y: Math.floor(z) };
}

/** Bậc zoom rời rạc (giữ pixel sắc nét); số ô thấy theo chiều dọc = ZOOM_BASE_TILES / zoom. */
export const ZOOM_LEVELS = [1, 1.5, 2, 3, 4] as const;
export const ZOOM_BASE_TILES = 32;

/** Bước zoom kế tiếp theo hướng (+1 gần lại, -1 xa ra), kẹp trong ZOOM_LEVELS. */
export function stepZoom(current: number, delta: number): number {
  let i = ZOOM_LEVELS.findIndex(z => z >= current);
  if (i < 0) i = ZOOM_LEVELS.length - 1;
  const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, i + Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta)))));
  return ZOOM_LEVELS[next];
}

/** Góc camera (alpha của ArcRotateCamera) cho hướng nhìn thứ `quarter` (0..3), chéo 45° isometric.
 *  Mỗi quarter lệch 90°. Quarter 0: camera đặt ở hướng đông-nam của tâm nhìn — thấy cùng lúc mặt tiền
 *  (phía nam) và mặt hông phía đông của tòa nhà, bản đồ chạy chéo (hình thoi) trên màn hình. */
export function isoAlpha(quarter: number): number {
  const q = ((quarter % 4) + 4) % 4;
  return Math.PI / 4 - q * (Math.PI / 2);
}

/** Làm tròn giá trị về bội số `step` (khóa camera theo pixel ảo để hình không rung). */
export function snapTo(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}

const FACING_DIRS: readonly Direction[] = ['up', 'right', 'down', 'left'] as const;

/**
 * Hướng quay của sprite theo vector di chuyển trên bản đồ `(dx, dz)` (X = cột, Z = hàng) và góc nhìn camera `quarter`.
 * Với camera chéo 45° (hệ tay phải): đổi vector về hướng màn hình bằng groundBasis (hướng phải/xuống của màn hình
 * chiếu xuống mặt đất), rồi chọn trong 4 hướng (up/down/left/right) hướng gần nhất; nếu trục ngang và trục dọc
 * lớn bằng nhau thì ưu tiên trái/phải.
 */
export function facingFromMovement(dx: number, dz: number, quarter: number): Direction {
  const q = ((quarter % 4) + 4) % 4;
  const a = isoAlpha(q);
  // groundBasis (hệ tay phải): vector thế giới (X, Z) tương ứng hướng phải / xuống của màn hình.
  const rX = Math.sin(a), rZ = -Math.cos(a);
  const dX = Math.cos(a), dZ = Math.sin(a);
  const sRight = dx * rX + dz * rZ;
  const sDown = dx * dX + dz * dZ;
  // Camera chéo 45° nên vector cardinal chiếu thành đường chéo → trục ngang/dọc bằng nhau; dùng dung sai để
  // tránh nhiễu dấu phẩy động, ưu tiên trái/phải khi bằng nhau.
  const eps = 1e-9;
  if (Math.abs(sRight) + eps >= Math.abs(sDown)) return sRight >= 0 ? 'right' : 'left';
  return sDown >= 0 ? 'down' : 'up';
}

/**
 * Hướng quay của sprite theo hướng đi trên bản đồ `direction` (cardinal) và góc nhìn camera `quarter`:
 * quy về vector đơn vị rồi dùng `facingFromMovement`.
 */
export function facingForCamera(direction: Direction, quarter: number): Direction {
  if (FACING_DIRS.indexOf(direction) < 0) return 'down';
  let dx = 0, dz = 0;
  switch (direction) {
    case 'up': dz = -1; break;
    case 'down': dz = 1; break;
    case 'left': dx = -1; break;
    case 'right': dx = 1; break;
  }
  return facingFromMovement(dx, dz, quarter);
}

/** Hướng đi theo độ dời giữa hai khung (trục dài hơn thắng); `fallback` khi đứng yên. */
export function directionFromDelta(dx: number, dy: number, fallback: Direction): Direction {
  if (Math.abs(dx) + Math.abs(dy) <= 0.01) return fallback;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

/** Kiểu khách/nhân viên đi bộ: có npc_3..9 thì 9 kiểu (bỏ npc_1 = chủ tiệm), không thì 3 kiểu (giống `walkerLook` của Pixi). */
export function walkerLookFor(hasKey: (key: string) => boolean, i: number): number {
  const n = Math.abs(Math.floor(i));
  if (hasKey('npc_9_down_idle_0')) return [0, 2, 3, 4, 5, 6, 7, 8, 9][n % 9];
  return hasKey('npc_8_down_idle_0') ? [0, 2, 3, 4, 5, 6, 7, 8][n % 8] : n % 3;
}

/** Khóa khung của NPC trong atlas: `npc_<look>_<hướng>_<walk|idle>_<khung>`. */
export function npcFrameKey(look: number, direction: Direction, walking: boolean, frame: number): string {
  return `npc_${look}_${direction}_${walking ? 'walk' : 'idle'}_${frame}`;
}
