import { TILE_SIZE, Vector2D } from '@game/shared';

/**
 * Khu vực Bốc dỡ & Giao nhận Hàng Hóa (Dedicated Loading / Unloading Area)
 * Tọa lạc tại góc phía đông của vỉa hè & lề đường (ô x = 17..24, hàng y = 11..13).
 * Có vạch kẻ sơn an toàn phản quang, pallet gỗ kê hàng và xe đẩy tay trung chuyển.
 */
export const LOADING_DOCK_CONFIG = {
  tileX: 17,
  tileY: 11,
  widthTiles: 5,
  heightTiles: 2,
  /** Vị trí xe tải dừng đỗ bốc dỡ (tọa độ px neo giữa đáy xe) */
  truckStopPosition: {
    x: 21.5 * TILE_SIZE, // 688px
    y: 13.2 * TILE_SIZE, // 422px (mép lòng đường giáp bãi bốc dỡ)
  },
  /** Vị trí nhân viên nhận/giao kiện hàng tại đuôi xe tải, trên vỉa hè */
  truckTailPosition: {
    x: 25 * TILE_SIZE, // 800px: ngay sau đuôi xe (xe dài 180-198 px, đỗ giữa tại 688px, đầu xe quay sang trái)
    y: 12.2 * TILE_SIZE, // 390.4px
  },
  /** Điểm bàn giao hàng hóa tại bãi tập kết phía Đông vỉa hè (không chắn cửa chính tiệm) */
  storeEntrancePosition: {
    x: 18.2 * TILE_SIZE, // 582.4px (tại pallet bãi tập kết)
    y: 11.8 * TILE_SIZE, // 377.6px
  },
  /** Vị trí pallet gỗ kê hàng */
  palletPosition: {
    x: 18.2 * TILE_SIZE,
    y: 11.8 * TILE_SIZE,
  },
  /** Vị trí xe đẩy hàng tay đỏ chờ sẵn cạnh pallet */
  trolleyPosition: {
    x: 17.2 * TILE_SIZE,
    y: 11.8 * TILE_SIZE,
  },
  /** Điểm nhập kho bên trong */
  warehouseStagingPosition: {
    x: 9.5 * TILE_SIZE,  // Cửa kho bên trong
    y: 4.5 * TILE_SIZE,
  },
} as const;

/** Thời gian thực hiện các pha trong một chuyến giao nhận (giây) */
export const LOGISTICS_TIMING = {
  approachDurationSec: 2.2,
  doorsOpenDurationSec: 0.8,
  unloadPerBoxSec: 1.2,
  workerWalkSpeed: 52, // px/s
  completedPauseSec: 1.0,
  departDurationSec: 2.8,
} as const;
