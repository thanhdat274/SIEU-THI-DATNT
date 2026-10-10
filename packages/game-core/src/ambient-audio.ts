export interface AmbientInput {
  rainIntensity: number;
  hour: number;
  isStoreOpen: boolean;
  /** Cường độ gió 0..1 từ lớp hiệu ứng thời tiết; bỏ trống = lặng gió. */
  windIntensity?: number;
  /** Độ dày mây 0..1 (giảm tiếng chim); bỏ trống = theo mưa. */
  cloudIntensity?: number;
  /** Gần mái nhà 0..1 (1 = đứng dưới mái): tăng tiếng mưa trên mái, giảm tiếng mưa ngoài trời. */
  roofProximity?: number;
}

export interface AmbientMix {
  /** Mức âm mưa 0..1. */
  rain: number;
  /** Tiếng phố ban ngày 0..1. */
  street: number;
  /** Tiếng côn trùng ban đêm 0..1 (mức nền của tiếng dế, đã là chirp ngắt quãng nên dịu hơn). */
  night: number;
  /** Tiếng gió 0..1. */
  wind: number;
  /** Tiếng chim ban ngày 0..1 (nhỏ dần khi nhiều mây/mưa, im khi giông). */
  birds: number;
  /** Tiếng mưa rơi trên mái 0..1. */
  roof: number;
}

export interface AudioSettings {
  muted: boolean;
  /** Khi tab ẩn: 'pause' dừng hẳn, 'duck' giảm còn 15%. */
  hiddenBehavior: 'pause' | 'duck';
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, hiddenBehavior: 'pause' };

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/** Mix môi trường theo thời tiết và giờ. Hàm thuần, không phát âm thanh. */
export function ambientMix(input: AmbientInput): AmbientMix {
  const day = input.hour >= 6 && input.hour < 19;
  return {
    rain: clamp01(input.rainIntensity) * 0.8 * (1 - 0.35 * clamp01(input.roofProximity ?? 0)),
    street: day ? (input.isStoreOpen ? 0.35 : 0.2) : 0.05,
    night: day ? 0 : 0.18,
    wind: clamp01(input.windIntensity ?? 0) * 0.7,
    birds: day ? clamp01(1 - clamp01(input.cloudIntensity ?? 0) * 0.55 - clamp01(input.rainIntensity) * 1.6 - clamp01(input.windIntensity ?? 0) * 0.3) ** 1.5 * 0.5 : 0,
    roof: clamp01(input.rainIntensity) * clamp01(input.roofProximity ?? 0) * 0.9,
  };
}

/** Hệ số âm lượng chung: 0 nếu tắt tiếng, chưa có user gesture, hoặc tab ẩn và chọn pause. */
export function masterGain(settings: AudioSettings, state: { userGestured: boolean; pageVisible: boolean }): number {
  if (settings.muted || !state.userGestured) return 0;
  if (!state.pageVisible) return settings.hiddenBehavior === 'duck' ? 0.15 : 0;
  return 1;
}

export function sanitizeAudioSettings(raw: unknown): AudioSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<AudioSettings>;
  return {
    muted: typeof value.muted === 'boolean' ? value.muted : DEFAULT_AUDIO_SETTINGS.muted,
    hiddenBehavior: value.hiddenBehavior === 'duck' ? 'duck' : 'pause',
  };
}
