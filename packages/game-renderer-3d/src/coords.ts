import { TILE_SIZE } from '@game/shared';

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

/** Góc camera (alpha của ArcRotateCamera) cho hướng nhìn thứ `quarter` (0..3), lệch 45° để ra góc isometric. */
export function isoAlpha(quarter: number): number {
  const q = ((quarter % 4) + 4) % 4;
  return -Math.PI / 4 - q * (Math.PI / 2);
}

/** Làm tròn giá trị về bội số `step` (khóa camera theo pixel ảo để hình không rung). */
export function snapTo(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}
