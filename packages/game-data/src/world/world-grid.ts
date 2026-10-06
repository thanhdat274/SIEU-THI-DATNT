/**
 * Lớp 1 của mô hình thế giới mở (OpenSpec `open-world-land-grid`): biên thế giới và vùng đang chơi được.
 * Hệ tọa độ giữ nguyên như cũ: ô 32 px, ô (0, −6) là góc trên-trái bản đồ chơi, đường chính ở hàng 13–15.
 * Không import file nào khác trong game-data để mọi lớp sau dùng được mà không vòng import.
 */

/** Chữ nhật ô, tính cả hai mép (x0..x1, y0..y1). */
export interface WorldRect { x0: number; x1: number; y0: number; y1: number }

/** Biên thế giới tối đa 120×80 ô (chốt 05/10/2026), chứa trọn bản đồ chơi và gần trùng khu phố trang trí. */
export const WORLD_BOUNDS: WorldRect = { x0: -42, x1: 77, y0: -36, y1: 43 };

/** Vùng đang chơi được: đợt khai hoang 0 = bản đồ chơi 36×22 hiện có. Mảng ô của `GameTileMap` đánh chỉ số theo vùng này. */
export const PLAY_REGION: WorldRect = { x0: 0, x1: 35, y0: -6, y1: 15 };

export const rectWidth = (rect: WorldRect): number => rect.x1 - rect.x0 + 1;
export const rectHeight = (rect: WorldRect): number => rect.y1 - rect.y0 + 1;
export const rectContains = (outer: WorldRect, inner: WorldRect): boolean =>
  inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;
export const rectHas = (rect: WorldRect, x: number, y: number): boolean => x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;
