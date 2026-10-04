/**
 * Bố cục sprite ô và áo mưa. File thuần dữ liệu, dùng chung cho bộ sinh ảnh (`tools/weather-sprites`) và renderer
 * (`game-renderer/src/weather-sprites.ts`) để hai bên luôn khớp: kích thước khung, điểm gắn theo hướng, tên khung.
 *
 * Hệ tọa độ nhân vật: gốc là chân giữa (neo 0.5,1 của sprite 32×48), x sang phải, y âm là lên trên.
 */
export const WEATHER_SPRITE_DIRS = ['down', 'up', 'left', 'right'] as const;
export type WeatherSpriteDir = (typeof WEATHER_SPRITE_DIRS)[number];

/** Màu theo thứ tự khóa trong `WEATHER_CONFIG.protection`. */
export const UMBRELLA_COLOR_NAMES = ['blue', 'red', 'yellow', 'green', 'purple'] as const;
export const RAINCOAT_COLOR_NAMES = ['yellow', 'blue', 'green', 'orange', 'red'] as const;

/** Khung nhân vật (cùng `character()` trong premium-textures). */
export const CHARACTER_FRAME = { w: 32, h: 48 } as const;

/** Tư thế nhân vật bên dưới áo mưa: áo mưa phải khớp tay/chân của đúng khung đó. */
export const RAINCOAT_POSES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3'] as const;
export type RaincoatPose = (typeof RAINCOAT_POSES)[number];

export type WindLean = 'L' | 'R';
export const WIND_LEANS: readonly WindLean[] = ['L', 'R'];

/** Số khung mỗi trạng thái gió (mỗi khung một pha lắc, tốc độ chạy do renderer chọn). */
export const RAINCOAT_WIND_FRAMES = { wind_light: 2, wind_strong: 3 } as const;
export type RaincoatWindState = keyof typeof RAINCOAT_WIND_FRAMES;

export const UMBRELLA_STATES = {
  /** Gập lại, chỉ còn cán cầm tay. */
  closed: { frames: 1, leans: false },
  /** Mở dần 3 bước (đóng = chạy ngược). */
  opening: { frames: 3, leans: false },
  open_idle: { frames: 2, leans: false },
  open_walk: { frames: 4, leans: false },
  wind_light: { frames: 4, leans: true },
  wind_strong: { frames: 5, leans: true },
} as const;
export type UmbrellaSpriteState = keyof typeof UMBRELLA_STATES;

/** Khung ô: 80×56, ô nằm trên đầu; điểm nắm (grip) là điểm ô chạm tay nhân vật. */
export const UMBRELLA_FRAME = { w: 80, h: 56, gripX: 40, gripY: 48 } as const;

/**
 * Điểm tay cầm ô theo hướng nhìn, tính từ chân nhân vật (px, y âm là lên). Khớp tay của sprite hiện có:
 * nhìn thẳng tay phải ở rìa phải thân; nhìn lưng tay phải ở rìa trái; nhìn ngang tay nằm giữa thân (hướng trái lật gương).
 */
export const UMBRELLA_ATTACHMENT: Record<WeatherSpriteDir, { x: number; y: number }> = {
  down: { x: 9, y: -15 },
  up: { x: -9, y: -15 },
  left: { x: 1, y: -15 },
  right: { x: -1, y: -15 },
};

/** Tâm vòm ô lệch so với điểm nắm theo hướng nhìn, để vòm nằm đúng trên đầu (đầu rộng 16 px, tâm đầu ở x=0). */
export const UMBRELLA_CANOPY_DX: Record<WeatherSpriteDir, number> = { down: -8, up: 9, left: -1, right: 1 };

/** Phần cán đi qua sau đầu (nhìn ngang): ẩn từ y này (px so với chân) tới cằm để cán không cắt ngang mặt. */
export const UMBRELLA_HEAD_MASK_Y = { top: -41, bottom: -26 } as const;

/** Khoảng lệch tay khi đi bộ (px) theo khung đi 0..3, dùng để cán ô đi theo tay. Nhìn ngang: tay vung ngang; nhìn thẳng/lưng: tay lên xuống. */
export const UMBRELLA_WALK_HAND: Record<WeatherSpriteDir, ReadonlyArray<{ dx: number; dy: number }>> = {
  down: [{ dx: 0, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
  up: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: 0 }, { dx: 0, dy: -1 }],
  left: [{ dx: 0, dy: 0 }, { dx: 3, dy: 0 }, { dx: 0, dy: 0 }, { dx: -3, dy: 0 }],
  right: [{ dx: 0, dy: 0 }, { dx: -3, dy: 0 }, { dx: 0, dy: 0 }, { dx: 3, dy: 0 }],
};

/** Tên khung trong manifest. */
export const umbrellaFrameName = (dir: WeatherSpriteDir, state: UmbrellaSpriteState, lean: WindLean | '-', i: number): string => `${dir}/${state}/${lean}/${i}`;
export const raincoatFrameName = (dir: WeatherSpriteDir, state: 'idle' | 'walk' | RaincoatWindState, lean: WindLean | '-', pose: RaincoatPose, i: number): string => `${dir}/${state}/${lean}/${pose}/${i}`;
