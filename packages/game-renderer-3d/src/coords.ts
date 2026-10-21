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

/** Góc nghiêng camera (beta của ArcRotateCamera, rad): ~52° từ phương thẳng đứng. */
export const CAMERA_BETA = 0.9;
/** Góc nhìn dọc của camera phối cảnh (rad, ~29°): nhỏ để giữ cảm giác "diorama", vẫn lộ mặt hông tòa lệch tâm. */
export const CAMERA_FOV = 0.5;

/** Nửa chiều cao vùng nhìn (đơn vị thế giới) tại tâm nhìn ở bậc zoom `zoom`. */
export function zoomHalfHeight(zoom: number): number { return ZOOM_BASE_TILES / zoom / 2; }

/** Bán kính camera (khoảng cách tới tâm) để chiều cao khung nhìn tại tâm đúng bằng chế độ ortho cũ: halfHeight / tan(fov/2). */
export function zoomRadius(zoom: number, fov: number = CAMERA_FOV): number {
  return zoomHalfHeight(zoom) / Math.tan(fov / 2);
}

/** Góc camera (alpha của ArcRotateCamera, hệ tay phải) cho hướng nhìn thứ `quarter` (0..3). Mỗi quarter lệch 90°.
 *  Quarter 0: camera ở phía nam (+Z) của tâm nhìn, nhìn về -Z → trục X bản đồ nằm ngang màn hình (X tăng → sang phải),
 *  Z tăng → xuống dưới: hướng màn hình = hướng bản đồ, đường nằm ngang như bản 2D. */
export function isoAlpha(quarter: number): number {
  const q = ((quarter % 4) + 4) % 4;
  return Math.PI / 2 - q * (Math.PI / 2);
}

/** Vector "lên" của camera (đơn vị) trong thế giới, từ alpha/beta: (-cosα·cosβ, sinβ, -sinα·cosβ).
 *  Sprite billboard đặt tâm tại chân + (H/2)·up thì mép dưới trùng đúng chân, cả ortho lẫn perspective. */
export function cameraUp(alpha: number, beta: number): { x: number; y: number; z: number } {
  return { x: -Math.cos(alpha) * Math.cos(beta), y: Math.sin(beta), z: -Math.sin(alpha) * Math.cos(beta) };
}

/** Tâm sprite billboard cao `height` có chân tại mặt đất (x, z). */
export function billboardCenter(x: number, z: number, height: number, alpha: number, beta: number): { x: number; y: number; z: number } {
  const u = cameraUp(alpha, beta);
  const h = height / 2;
  return { x: x + u.x * h, y: u.y * h, z: z + u.z * h };
}

/** Bán kính (thế giới, quanh tâm nhìn) đủ phủ phần mặt đất camera phối cảnh thấy — cho Crowd3D chọn vùng chạy chi tiết. */
export function groundViewRadius(zoom: number, aspect: number, beta: number, fov: number = CAMERA_FOV): number {
  const r = zoomRadius(zoom, fov);
  const hc = r * Math.cos(beta);
  const horiz = r * Math.sin(beta);
  const half = fov / 2;
  const depFar = Math.max(0.05, Math.PI / 2 - beta - half);
  const depNear = Math.PI / 2 - beta + half;
  const far = hc / Math.tan(depFar) - horiz;
  const near = horiz - hc / Math.tan(depNear);
  const lateral = (hc / Math.sin(depFar)) * Math.tan(half) * aspect;
  return Math.hypot(Math.max(far, near, 0), lateral);
}

/**
 * Bounding box hình chiếu vùng nhìn camera xuống mặt đất Y = 0 (dùng cho MinimapSnapshot).
 * Phối cảnh: 4 góc màn hình (u = ±1, v = ±1) phát tia cắt mặt phẳng Y = 0.
 * Hỗ trợ xoay camera theo 4 hướng (quarter 0..3), góc nghiêng beta, fov và tỉ lệ khung hình aspect.
 */
export function cameraGroundViewBounds(
  centerX: number,
  centerZ: number,
  zoom: number,
  quarter: number,
  aspect: number,
  beta: number = CAMERA_BETA,
  fov: number = CAMERA_FOV,
): { x0: number; y0: number; x1: number; y1: number } {
  const r = zoomRadius(zoom, fov);
  const a = isoAlpha(quarter);
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  const sinB = Math.sin(beta);
  const cosB = Math.cos(beta);

  const cx = centerX + r * sinB * cosA;
  const cy = r * cosB;
  const cz = centerZ + r * sinB * sinA;

  const fx = -sinB * cosA, fy = -cosB, fz = -sinB * sinA;
  const rx = sinA, ry = 0, rz = -cosA;
  const ux = -cosA * cosB, uy = sinB, uz = -sinA * cosB;

  const thY = Math.tan(fov / 2);
  const thX = thY * aspect;

  const corners: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [u, v] of corners) {
    const dx = fx + (u * thX) * rx + (v * thY) * ux;
    const dy = fy + (u * thX) * ry + (v * thY) * uy;
    const dz = fz + (u * thX) * rz + (v * thY) * uz;

    if (Math.abs(dy) < 1e-6) continue;
    const t = -cy / dy;
    if (t <= 0) continue;

    const px = cx + t * dx;
    const pz = cz + t * dz;

    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (pz < minZ) minZ = pz;
    if (pz > maxZ) maxZ = pz;
  }

  if (!Number.isFinite(minX)) {
    const halfH = zoomHalfHeight(zoom);
    minX = centerX - halfH * aspect;
    maxX = centerX + halfH * aspect;
    minZ = centerZ - halfH;
    maxZ = centerZ + halfH;
  }

  return { x0: minX, y0: minZ, x1: maxX, y1: maxZ };
}

/** Làm tròn giá trị về bội số `step` (khóa camera theo pixel ảo để hình không rung). */
export function snapTo(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}

/** Khóa tâm camera (x, z) theo lưới pixel màn hình tại mặt phẳng tâm: ngang theo `step`, dọc theo `step / sin β`
 *  (mặt đất bị ép theo góc nghiêng). Phối cảnh không khóa được mọi độ sâu, nhưng tâm/sprite người chơi thì không rung. */
export function snapGround(x: number, z: number, alpha: number, beta: number, step: number): { x: number; z: number } {
  const rx = Math.sin(alpha), rz = -Math.cos(alpha);
  const dx = Math.cos(alpha), dz = Math.sin(alpha);
  const sr = snapTo(x * rx + z * rz, step);
  const sd = snapTo(x * dx + z * dz, step / Math.sin(beta));
  return { x: sr * rx + sd * dx, z: sr * rz + sd * dz };
}

const FACING_DIRS: readonly Direction[] = ['up', 'right', 'down', 'left'] as const;

/**
 * Hướng quay của sprite theo vector di chuyển trên bản đồ `(dx, dz)` (X = cột, Z = hàng) và góc nhìn camera `quarter`.
 * Đổi vector về hướng màn hình bằng groundBasis (hướng phải/xuống của màn hình chiếu xuống mặt đất, hệ tay phải),
 * rồi chọn trong 4 hướng (up/down/left/right) hướng gần nhất. Quarter 0: hướng màn hình = hướng bản đồ; quarter lẻ:
 * camera xoay 90° nên up/down/left/right bản đồ thành right/left/up/down; trục ngang bằng dọc thì ưu tiên trái/phải.
 */
export function facingFromMovement(dx: number, dz: number, quarter: number): Direction {
  const q = ((quarter % 4) + 4) % 4;
  const a = isoAlpha(q);
  // groundBasis (hệ tay phải): vector thế giới (X, Z) tương ứng hướng phải / xuống của màn hình.
  const rX = Math.sin(a), rZ = -Math.cos(a);
  const dX = Math.cos(a), dZ = Math.sin(a);
  const sRight = dx * rX + dz * rZ;
  const sDown = dx * dX + dz * dZ;
  // Dung sai tránh nhiễu dấu phẩy động khi vector chéo; ưu tiên trái/phải khi ngang bằng dọc.
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
