import { TILE_SIZE, Vector2D } from '@game/shared';

/**
 * Khu vực Bốc dỡ & Giao nhận Hàng Hóa (Dedicated Loading / Unloading Area)
 * Tọa lạc tại góc phía đông của vỉa hè & lề đường (ô x = 20..24, hàng y = 11..13).
 * Có vạch kẻ sơn an toàn phản quang, pallet gỗ kê hàng và lối vận chuyển hàng vào kho.
 */
export const LOADING_DOCK_CONFIG = {
  tileX: 20,
  tileY: 11,
  widthTiles: 4,
  heightTiles: 2,
  /** Vị trí xe tải dừng đỗ bốc dỡ (tọa độ px neo giữa đáy xe) */
  truckStopPosition: {
    x: 21.5 * TILE_SIZE, // 688px
    y: 13.2 * TILE_SIZE, // 422px (mép lòng đường giáp bãi bốc dỡ)
  },
  /** Vị trí nhân viên nhận/giao kiện hàng tại đuôi xe tải, trên vỉa hè */
  truckTailPosition: {
    x: 20.2 * TILE_SIZE,
    y: 12.2 * TILE_SIZE,
  },
  /** Điểm bàn giao ở ngoài cửa chính, trên vỉa hè (không đi xuyên vào trong nhà) */
  storeEntrancePosition: {
    x: 10 * TILE_SIZE,
    y: 11.7 * TILE_SIZE,
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
