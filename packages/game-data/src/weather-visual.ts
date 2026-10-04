/**
 * Cấu hình hiệu ứng thời tiết (chỉ hình ảnh/âm thanh). Mọi thông số tune nằm ở đây, renderer không hard-code.
 * Thời tiết thật (loại, cường độ mưa theo giờ) vẫn do game-core tính theo hạt giống; lớp này chỉ làm mượt và diễn giải.
 */
export type WeatherQuality = 'low' | 'medium' | 'high';

/** Tiền đặt để gọi qua debug/transitionWeather; map về các thông số liên tục, không phải state cứng. */
export type WeatherPresetId = 'clear' | 'cloudy' | 'rain_light' | 'rain' | 'rain_heavy' | 'storm' | 'wind_light' | 'wind_strong';

export interface WeatherTargets {
  rain: number;
  wind: number;
  cloud: number;
  /** Có sấm chớp không (chỉ bật khi mưa đủ lớn). */
  lightning: boolean;
}

export const WEATHER_PRESETS: Record<WeatherPresetId, WeatherTargets> = {
  clear: { rain: 0, wind: 0.08, cloud: 0.1, lightning: false },
  cloudy: { rain: 0, wind: 0.2, cloud: 0.7, lightning: false },
  rain_light: { rain: 0.15, wind: 0.1, cloud: 0.65, lightning: false },
  rain: { rain: 0.55, wind: 0.3, cloud: 0.8, lightning: false },
  rain_heavy: { rain: 0.88, wind: 0.5, cloud: 0.92, lightning: false },
  storm: { rain: 1, wind: 0.9, cloud: 1, lightning: true },
  wind_light: { rain: 0, wind: 0.25, cloud: 0.3, lightning: false },
  wind_strong: { rain: 0, wind: 0.8, cloud: 0.5, lightning: false },
};

/** Mây/gió nền theo loại thời tiết của game (WEATHER_TYPES.id). */
export const WEATHER_BASE_BY_ID: Record<string, { cloud: number; wind: number }> = {
  sunny: { cloud: 0.1, wind: 0.08 },
  hot: { cloud: 0.04, wind: 0.05 },
  cold: { cloud: 0.4, wind: 0.2 },
  cloudy: { cloud: 0.65, wind: 0.2 },
  rainy: { cloud: 0.75, wind: 0.22 },
  heavy_rain: { cloud: 0.9, wind: 0.4 },
  storm: { cloud: 1, wind: 0.8 },
  special: { cloud: 0.6, wind: 0.04 },
};

export const WEATHER_CONFIG = {
  /** Mốc mưa (cường độ 0..1) tương ứng các dải hiển thị. */
  rainTiers: { light: 0.15, normal: 0.45, heavy: 0.75 },
  rain: {
    /** Số giọt tối đa theo chất lượng khi cường độ = 1 (đã nhân hệ số adaptive). */
    maxDrops: { low: 90, medium: 190, high: 340 } as Record<WeatherQuality, number>,
    /** Tốc độ rơi px/s theo cường độ (nội suy tuyến tính). */
    speedMin: 190,
    speedMax: 340,
    /** Chiều dài vạch mưa px theo cường độ. */
    lengthMin: 4,
    lengthMax: 11,
    /** Hệ số gió đẩy mưa (px/s mỗi 1.0 gió). */
    windPush: 170,
    /** Hệ số gió tăng tốc rơi. */
    windFallBoost: 40,
    /** Tỷ lệ giọt có splash khi chạm đất, theo chất lượng. */
    splashChance: { low: 0.12, medium: 0.28, high: 0.45 } as Record<WeatherQuality, number>,
    maxSplashes: { low: 14, medium: 36, high: 70 } as Record<WeatherQuality, number>,
    /** Tỷ lệ giọt "gần camera" (to hơn, rơi nhanh hơn). */
    nearFraction: 0.12,
    color: 0xb9d8e8,
    colorNear: 0xdcecf5,
  },
  wind: {
    /** Gió nền đổi hướng chậm theo ngày; 0 = từ trái sang phải. Biên độ lệch (rad). */
    directionSpread: 0.5,
    /** Gió giật: biên độ và chu kỳ (giây). */
    gustAmplitude: 0.25,
    gustPeriodSec: 7,
    /** Hệ số phản ứng của từng loại vật (tương đối). */
    response: { leaf: 1, paper: 0.9, sign: 0.6, tree: 0.35, building: 0 },
    maxDebris: { low: 0, medium: 10, high: 22 } as Record<WeatherQuality, number>,
    /** Gió tối thiểu để lá/rác bắt đầu bay. */
    debrisThreshold: 0.12,
    /** Biên độ lắc biển hiệu / vật treo tối đa (px) khi gió = 1 (nhân response.sign). */
    signSwayPx: 3,
  },
  cloud: {
    maxShadowBlobs: { low: 3, medium: 5, high: 8 } as Record<WeatherQuality, number>,
    /** Tốc độ trôi px/s ở gió 0 và thêm theo gió. */
    driftBase: 5,
    driftWind: 55,
    /** Độ tối tối đa của bóng mây trên cảnh. */
    shadowAlpha: 0.16,
    color: 0x1b2a3a,
  },
  /** Bóng tối chung do mây dày + mưa (phủ nhẹ, không che gameplay). */
  darkness: { max: 0.42, color: 0x0e1824, fromCloud: 0.32, fromRain: 0.2 },
  fog: { color: 0xaebfc9, maxAlpha: 0.14 },
  puddle: {
    /** Tốc độ mượt (1/s) khi nước dâng và khi cạn: cạn chậm hơn nhiều. */
    riseRate: 0.25,
    fallRate: 0.03,
    rippleChance: { low: 0.4, medium: 0.8, high: 1.4 } as Record<WeatherQuality, number>,
    maxRipples: { low: 4, medium: 10, high: 18 } as Record<WeatherQuality, number>,
  },
  lightning: {
    /** Khoảng cách giữa hai loạt chớp (giây thực). */
    minInterval: 5,
    maxInterval: 16,
    /** Loạt chớp: [thời lượng giây, cường độ] xen kẽ tối. */
    patterns: [
      [[0.07, 1], [0.08, 0], [0.05, 0.55]],
      [[0.06, 0.9]],
      [[0.05, 0.8], [0.06, 0], [0.07, 1], [0.1, 0], [0.04, 0.4]],
    ] as ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
    /** Sấm trễ sau chớp (giây). */
    thunderDelayMin: 0.6,
    thunderDelayMax: 3,
    flashAlpha: 0.32,
    flashColor: 0xdfe8ff,
    /** Rung camera (px thế giới) khi sấm lớn nhất, giảm dần. */
    shakePx: 1.5,
    shakeDecaySec: 0.45,
  },
  /** Chuyển trạng thái: thời gian làm mượt mặc định (giây thực) cho từng đại lượng. */
  transition: {
    defaultSec: 12,
    cloudSec: 14,
    windSec: 10,
    rainSec: 8,
  },
  /** Mây nhìn thấy: lớp nền (chậm, mờ, nhỏ) và lớp trước (nhanh hơn, to hơn), có parallax theo camera. */
  sky: {
    maxBg: { low: 5, medium: 9, high: 13 } as Record<WeatherQuality, number>,
    maxFg: { low: 3, medium: 5, high: 8 } as Record<WeatherQuality, number>,
    bgParallax: 0.25,
    fgParallax: 0.55,
    bgAlpha: 0.55,
    fgAlpha: 0.75,
    /** Mây trời quang: trắng sáng; nhiều mây/mưa xám dần (`colorOvercast`); giông/đêm xám đen (`colorDark`). */
    colorLight: 0xf1f5f9,
    colorOvercast: 0x8c97a4,
    colorDark: 0x2f3742,
    /** Mây tối nhất khi có bóng dưới (nửa dưới đám mây). */
    shadeLight: 0x9fb0c2,
  },
  /** Nước chảy từ mái hiên/mái nhà: mỗi 'khe' cách nhau `spacing` px; tỉ lệ khe đang chảy tăng theo mưa. */
  roofWater: {
    spacing: 16,
    dropHeight: 15,
    speedMin: 16,
    speedMax: 70,
    color: 0xcfe6f2,
    maxSlots: { low: 16, medium: 32, high: 56 } as Record<WeatherQuality, number>,
  },
  /** Hệ số tốc độ đi bộ của NPC ngoài trời theo mưa: nhẹ = 1; vừa, to, giông nội suy giữa các mốc. */
  rainWalkSpeed: { clear: 1, rain: 1.05, heavy: 1.1, storm: 1.15 },
  /** Đồ che mưa của người (ô/áo mưa): tỉ lệ theo mức mưa, chỉnh được. Tổng mỗi nhóm nên bằng 1. */
  protection: {
    /** Mưa nhẹ (dưới rainTiers.normal): phần 'none' tiếp tục đi bình thường, chưa che gì. */
    light: { umbrella: 0.5, raincoat: 0.3, none: 0.2 },
    /** Mưa vừa trở lên: ai ngoài trời cũng che. */
    normal: { umbrella: 0.6, raincoat: 0.4 },
    /** Dưới mức này coi như chưa mưa. */
    minRain: 0.05,
    /** Mỗi người bắt đầu che ở một mức mưa riêng trong khoảng này (mưa nhẹ), để không đồng loạt. */
    triggerMin: 0.06,
    triggerMax: 0.28,
    /** Màu áo mưa và ô (tên khớp khóa sprite `raincoat_<màu>_…`, `umbrella_<màu>_…`). */
    raincoatColors: ['yellow', 'blue', 'green', 'orange', 'red'] as readonly string[],
    umbrellaColors: ['blue', 'red', 'yellow', 'green', 'purple'] as readonly string[],
    /** Tốc độ mở/đóng ô (1/giây). */
    openRate: 5,
  },
  /** Cơn mưa sắp tới ảnh hưởng mây/gió trước bao nhiêu phút game. */
  lookAheadMinutes: 75,
  adaptive: {
    /** Khung hình trung bình (ms) vượt ngưỡng này thì giảm mật độ. */
    slowFrameMs: 26,
    fastFrameMs: 19,
    minFactor: 0.35,
    stepDown: 0.85,
    stepUp: 1.04,
  },
} as const;

export const DEFAULT_WEATHER_FX_SETTINGS = {
  enabled: true,
  /** Hệ số nhân mật độ/độ đậm hiệu ứng, 0..1. */
  intensity: 1,
  quality: null as WeatherQuality | null,
};
