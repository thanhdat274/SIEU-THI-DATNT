import type { FixtureBox } from './fixture-shapes';

/** Hộp bao trục song song trong toạ độ thế giới 3D (đơn vị = ô; Y hướng lên). */
export interface Bounds3 {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

/** Hộp bao của một danh sách khối; danh sách rỗng ném lỗi (không có hình để đo). */
export function boxesBounds(boxes: readonly FixtureBox[]): Bounds3 {
  if (boxes.length === 0) throw new Error('Không có khối nào để tính hộp bao');
  const b: Bounds3 = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const box of boxes) {
    b.minX = Math.min(b.minX, box.cx - box.sx / 2); b.maxX = Math.max(b.maxX, box.cx + box.sx / 2);
    b.minY = Math.min(b.minY, box.cy - box.sy / 2); b.maxY = Math.max(b.maxY, box.cy + box.sy / 2);
    b.minZ = Math.min(b.minZ, box.cz - box.sz / 2); b.maxZ = Math.max(b.maxZ, box.cz + box.sz / 2);
  }
  return b;
}

export function boundsSize(b: Bounds3): { x: number; y: number; z: number } {
  return { x: b.maxX - b.minX, y: b.maxY - b.minY, z: b.maxZ - b.minZ };
}

export function boundsCenter(b: Bounds3): { x: number; y: number; z: number } {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** Khối `box` có chạm vùng chữ nhật (x, y) không (bỏ qua z); chạm mép không tính. */
export function boxOverlapsRectXY(box: FixtureBox, rect: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  return box.cx + box.sx / 2 > rect.minX && box.cx - box.sx / 2 < rect.maxX
    && box.cy + box.sy / 2 > rect.minY && box.cy - box.sy / 2 < rect.maxY;
}
