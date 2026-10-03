/**
 * Chu kỳ đèn tín hiệu tại vạch qua đường trước cửa tiệm (giây mô phỏng, tính theo dt của hẻm, không theo giờ game).
 * Một chu kỳ: xanh → vàng → đỏ. Người đi bộ được đi (walk) từ `pedLeadSec` giây sau khi xe bắt đầu đỏ trong `pedWalkSec`
 * giây, phần đỏ còn lại là nhấp nháy dọn đường (clearing): người đang qua kịp đi hết, người chờ không bắt đầu qua.
 */
export const TRAFFIC_SIGNAL = {
  greenSec: 26,
  yellowSec: 3,
  redSec: 15,
  pedLeadSec: 1,
  pedWalkSec: 9,
} as const;

export const TRAFFIC_SIGNAL_CYCLE_SEC = TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec + TRAFFIC_SIGNAL.redSec;

/** Người đi bộ băng qua đường chung (chỉ hình ảnh): tốc độ px/s, số tối đa cùng lúc, thời gian chờ giữa hai lượt sinh. */
export const STREET_PEDESTRIANS = {
  speed: 38,
  maxConcurrent: 2,
  minCooldownSec: 18,
  maxCooldownSec: 42,
  /** Mép vỉa phía bắc (y px) nơi đứng chờ, và mép phía nam. */
  northCurbY: 12.85 * 32,
  southCurbY: 15.15 * 32,
  /** Cường độ mưa (0..1) tối đa mà còn có người qua đường / đi vỉa hè / ghé quầy. */
  maxRainCrossing: 0.6,
  maxRainSidewalk: 0.7,
  maxRainStallVisit: 0.7,
} as const;

/** Xe dừng cách mép vạch qua đường ngần này (px) và giữ khoảng cách tối thiểu với xe phía trước. */
export const STREET_VEHICLE_RULES = {
  stopMarginPx: 6,
  followGapPx: 14,
  decel: 140,
  accel: 80,
  halfLength: { motorbike: 22, car: 32, bicycle: 18, minibus: 46 },
} as const;
