import { boxesBounds, type Bounds3 } from '../box-bounds';
import type { FixtureBox } from '../fixture-shapes';

/**
 * Một mảnh chi tiết của bộ kit (khung cửa, cửa sổ, phào, trụ...): danh sách khối trong hệ cục bộ.
 * Quy ước hệ cục bộ (cùng nội thất `fixture-shapes`): x chạy ngang và căn giữa mảnh, y hướng lên từ 0 ở đáy mảnh,
 * +z là mặt trước (hướng ra phố). Mảnh nào có mặt phẳng tường thì mặt phẳng đó ở z = 0.
 */
export interface KitPiece {
  id: string;
  boxes: FixtureBox[];
  /** Hộp bao thật của các khối (tính từ chính `boxes`, không khai báo tay). */
  bounds: Bounds3;
  /** Vùng (x, y) phải trống để người/đồ đi qua (lối cửa); không khối nào được chạm vào. */
  opening?: { minX: number; maxX: number; minY: number; maxY: number };
}

export function kitBox(color: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, alpha?: number): FixtureBox {
  return alpha === undefined ? { color, cx, cy, cz, sx, sy, sz } : { color, alpha, cx, cy, cz, sx, sy, sz };
}

export function makePiece(id: string, boxes: FixtureBox[], opening?: KitPiece['opening']): KitPiece {
  return { id, boxes, bounds: boxesBounds(boxes), ...(opening ? { opening } : {}) };
}
