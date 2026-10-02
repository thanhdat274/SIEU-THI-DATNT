export interface AmbientInput {
  rainIntensity: number;
  hour: number;
  isStoreOpen: boolean;
}

export interface AmbientMix {
  /** Mức âm mưa 0..1. */
  rain: number;
  /** Tiếng phố ban ngày 0..1. */
  street: number;
  /** Tiếng côn trùng ban đêm 0..1. */
  night: number;
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
    rain: clamp01(input.rainIntensity) * 0.8,
    street: day ? (input.isStoreOpen ? 0.35 : 0.2) : 0.05,
    night: day ? 0 : 0.3,
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
