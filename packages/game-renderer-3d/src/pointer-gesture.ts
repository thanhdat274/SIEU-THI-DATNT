/** Ngưỡng (px) phân biệt click với kéo camera, giống viewport-input.ts của Pixi. */
export const DRAG_THRESHOLD_PX = 4;

export interface PointerXY { x: number; y: number }

/** Con trỏ đã rời điểm nhấn quá ngưỡng → cử chỉ là kéo camera (mọi nút chuột). */
export function exceedsDragThreshold(down: PointerXY, now: PointerXY, threshold = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(now.x - down.x, now.y - down.y) > threshold;
}

/** Thả chuột có tính là click không: chuột trái, chưa từng vượt ngưỡng kéo. */
export function isClickRelease(button: number, wasDragging: boolean): boolean {
  return button === 0 && !wasDragging;
}
