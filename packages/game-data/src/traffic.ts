/**
 * Đèn tín hiệu: chu kỳ tổng bằng 39 PHÚT GAME dùng chung cho cả vạch trước cửa tiệm và các ngã tư, nên pha đèn suy được
 * 1-1 từ worldTime (ngày + phút) qua `trafficSignalPhaseFromWorldClock` — cùng giờ trên mọi client/WorldRuntime cho cùng
 * pha, đúng cả ban đêm ×3 và catch-up, không gửi qua mạng mỗi khung.
 *
 * Một tín hiệu: xanh → vàng → đỏ. Người đi bộ được đi (walk) từ `pedLeadSec` phút sau khi xe bắt đầu đỏ trong `pedWalkSec`
 * phút; phần đỏ còn lại là nhấp nháy dọn đường (clearing): người đang qua kịp đi hết, người chờ không bắt đầu qua.
 *
 * Có HAI cấu hình chu kỳ riêng (cùng độ dài 39 phút, nền pha worldTime vẫn là một):
 *  - `STORE_FRONT_SIGNAL` (vạch trước cửa tiệm, khách thật đi bộ băng qua đường — OpenSpec 4.5): ưu tiên NGƯỜI ĐI BỘ,
 *    pha walk 22/39 ≈ 56% chu kỳ để khách băng vạch không chờ lâu làm tụt lượng khách/doanh thu (xem tổng hợp.md — 4.3).
 *  - `INTERSECTION_SIGNAL` (các ngã tư, xe nền + khách đi ô tô): giữ chu kỳ cũ ưu tiên XE, xe xanh 26/39 ≈ 67% chu kỳ
 *    để xe không đứng chờ đỏ hầu hết thời gian (bật với vạch trước tiệm — các ngã tư KHÔNG ưu tiên người đi bộ).
 */
export interface TrafficSignalConfig {
  greenSec: number;
  yellowSec: number;
  redSec: number;
  pedLeadSec: number;
  pedWalkSec: number;
}

/** Đèn vạch trước cửa tiệm (khách thật băng qua đường): ưu tiên người đi bộ (walk 22/39 ≈ 56%). */
export const STORE_FRONT_SIGNAL: TrafficSignalConfig = {
  greenSec: 7,
  yellowSec: 2,
  redSec: 30,
  pedLeadSec: 1,
  pedWalkSec: 22,
};

/** Đèn các ngã tư: ưu tiên xe (xe xanh 26/39 ≈ 67%). */
export const INTERSECTION_SIGNAL: TrafficSignalConfig = {
  greenSec: 26,
  yellowSec: 3,
  redSec: 10,
  pedLeadSec: 1,
  pedWalkSec: 5,
};

/** Độ dài chu kỳ đèn (phút game) — chung cho cả hai tín hiệu để pha worldTime là duy nhất. */
export const TRAFFIC_SIGNAL_CYCLE_SEC = 39 as const;

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

/**
 * Vạch qua đường trước cửa tiệm chính dành cho KHÁCH THẬT đi bộ băng qua đường vào tiệm (OpenSpec
 * `traffic-light-crosswalk-yielding` 4.5). Nằm ngang trên đường chính (main), ngay trước cửa (tile 9–12),
 * đứng cùng pha đèn main (người đi bộ đi khi main đỏ). Đơn vị px trong hệ tọa độ thế giới.
 */
export const STORE_FRONT_CROSSWALK = {
  roadId: 'main',
  /** Mép tây/đông của vạch (px). */
  x0: 8 * 32, // 256 — tile 8
  x1: 12 * 32, // 384 — tile 12 (che cửa chính 9–10)
  /** Hàng bắt đầu đường phía cửa tiệm (đầu bắc của vạch) — px. */
  nearY: 13 * 32, // 416 — mép vỉa hè phía tiệm (đầu đường main)
  /** Hàng phía bên kia đường (đầu nam của vạch) — px. */
  farY: 16 * 32, // 512 — mép dưới của đường main (bên kia đường)
} as const;

