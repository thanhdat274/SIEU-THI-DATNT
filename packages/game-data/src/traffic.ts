/**
 * Chu kỳ đèn tín hiệu dùng chung cho các ngã tư (giây mô phỏng, tính theo dt của hẻm, không theo giờ game; mỗi ngã tư lệch pha riêng).
 * Một chu kỳ: xanh → vàng → đỏ. Người đi bộ được đi (walk) từ `pedLeadSec` giây sau khi xe bắt đầu đỏ trong `pedWalkSec`
 * giây, phần đỏ còn lại là nhấp nháy dọn đường (clearing): người đang qua kịp đi hết, người chờ không bắt đầu qua.
 */
export const TRAFFIC_SIGNAL = {
  greenSec: 26,
  yellowSec: 3,
  redSec: 10,
  pedLeadSec: 1,
  pedWalkSec: 5,
} as const;

export const TRAFFIC_SIGNAL_CYCLE_SEC = TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec + TRAFFIC_SIGNAL.redSec;

/** Người đi bộ nền trên vỉa hè (chỉ hình ảnh): tốc độ px/s và ngưỡng mưa. */
export const STREET_PEDESTRIANS = {
  speed: 38,
  /** Cường độ mưa (0..1) tối đa mà còn có người đi vỉa hè / ghé quầy. */
  maxRainSidewalk: 0.7,
  maxRainStallVisit: 0.7,
} as const;

/** Xe dừng cách mép vạch qua đường ngần này (px) và giữ khoảng cách tối thiểu với xe phía trước. */
export const STREET_VEHICLE_RULES = {
  stopMarginPx: 6,
  followGapPx: 14,
  decel: 140,
  accel: 140,
  halfLength: { motorbike: 31, car: 65, bicycle: 32, minibus: 96, truck: 90 },
  /** Nửa chiều dài theo trục y của xe chạy đường dọc (nhìn trước/sau, ngắn hơn khi nhìn nghiêng). */
  halfLengthY: { motorbike: 22, car: 30, bicycle: 22, minibus: 44, truck: 48 },
} as const;
