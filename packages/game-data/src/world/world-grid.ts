/**
 * Lớp 1 của mô hình thế giới mở (OpenSpec `open-world-land-grid`): biên thế giới và vùng đang chơi được.
 * Hệ tọa độ giữ nguyên như cũ: ô 32 px, ô (0, −6) là góc trên-trái bản đồ chơi, đường chính ở hàng 13–15.
 * Không import file nào khác trong game-data để mọi lớp sau dùng được mà không vòng import.
 * (Ngoại lệ duy nhất cho bước này: import hằng số RECLAMATION_WAVES ở dưới để suy hộp hợp các đợt đã mở — D2.)
 */

/** Chữ nhật ô, tính cả hai mép (x0..x1, y0..y1). */
export interface WorldRect { x0: number; x1: number; y0: number; y1: number }

// Được import ở đây (không phải const độc lập) để tránh sao chép dữ liệu đợt: mọi read chỉ xảy ra lúc gọi hàm,
// nên vòng import world-grid ⇄ waves an toàn trong module graph hiện tại (waves không dùng binding world-grid ở thời điểm đánh giá module).
import { RECLAMATION_WAVES } from './waves';

/** Biên thế giới tối đa 120×80 ô (chốt 05/10/2026), chứa trọn bản đồ chơi và gần trùng khu phố trang trí. */
export const WORLD_BOUNDS: WorldRect = { x0: -42, x1: 77, y0: -36, y1: 43 };

/** Vùng đang chơi được: đợt khai hoang 0 = bản đồ chơi 36×22 hiện có. Mảng ô của `GameTileMap` đánh chỉ số theo vùng này. */
export const PLAY_REGION: WorldRect = { x0: 0, x1: 35, y0: -6, y1: 15 };

export const rectWidth = (rect: WorldRect): number => rect.x1 - rect.x0 + 1;
export const rectHeight = (rect: WorldRect): number => rect.y1 - rect.y0 + 1;
export const rectContains = (outer: WorldRect, inner: WorldRect): boolean =>
  inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;
export const rectHas = (rect: WorldRect, x: number, y: number): boolean => x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;

/**
 * (OpenSpec `open-world-land-reclamation` D2) Hộp chữ nhật NHỎ NHẤT hợp `region` của mọi đợt trong `openedWaves`.
 * Dùng lookup `RECLAMATION_WAVES` (waves.ts). Với ['w0'] trả đúng `PLAY_REGION` (36×22) — giữ golden cho bản đồ
 * đợt 0 không đổi. Nếu không tìm thấy đợt nào (danh sách rỗng/không hợp lệ) trả `PLAY_REGION` làm mặc định an toàn
 * (vùng tối thiểu vẫn là bản đồ gốc). Ô trong hộp nhưng ngoài mọi đợt đã mở là vùng CHƯA khai hoang — bản đồ dựng
 * ở map.ts (generateTileMapForWaves) sẽ đánh va chạm cho các ô đó.
 */
export function playRegionForWaves(openedWaves: readonly string[]): WorldRect {
  const regions = openedWaves
    .map(id => RECLAMATION_WAVES.find(w => w.id === id)?.region)
    .filter((r): r is WorldRect => r !== undefined);
  if (regions.length === 0) return PLAY_REGION;
  return {
    x0: Math.min(...regions.map(r => r.x0)),
    y0: Math.min(...regions.map(r => r.y0)),
    x1: Math.max(...regions.map(r => r.x1)),
    y1: Math.max(...regions.map(r => r.y1)),
  };
}
