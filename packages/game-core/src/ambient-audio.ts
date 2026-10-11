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

interface Point { x: number; y: number }

/**
 * Tiếng bước chân nhân viên bảo vệ đi tuần (đơn vị px thế giới, 1 ô = 32px). Nghe theo hướng: lệch trái/phải theo
 * vị trí nguồn so với người chơi, càng xa càng nhỏ, ngoài `hearRange` thì không nghe.
 */
export const FOOTSTEP_RULES = {
  /** Quãng đường đi để phát một bước chân. */
  stepDistance: 26,
  /** Ngoài khoảng này không nghe thấy. */
  hearRange: 192,
  /** Lệch tối đa (±1) khi nguồn cách người nghe đúng khoảng này theo phương ngang. */
  panRange: 96,
  /** Nhảy vị trí quá xa giữa hai lần lấy mẫu (đổi tầng, reset) thì không tính là đi bộ. */
  maxJump: 128,
  /** Số bước tối đa phát trong một lần lấy mẫu để tránh dồn tiếng. */
  maxStepsPerSample: 2,
} as const;

export interface FootstepCue {
  /** −1 (trái) .. 1 (phải). */
  pan: number;
  /** 0..1, giảm theo khoảng cách. */
  gain: number;
}

/** Hướng và độ lớn của một bước chân từ `source` tới `listener`; `null` nếu quá xa để nghe. Hàm thuần. */
export function footstepCue(listener: Point, source: Point, rules: { hearRange: number; panRange: number } = FOOTSTEP_RULES): FootstepCue | null {
  const dx = source.x - listener.x;
  const dy = source.y - listener.y;
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist >= rules.hearRange) return null;
  return {
    pan: Math.max(-1, Math.min(1, dx / rules.panRange)),
    gain: 1 - dist / rules.hearRange,
  };
}

/**
 * Đếm bước chân của từng nguồn từ các lần lấy mẫu vị trí: quãng đường đi tích lũy, dư sang lần sau.
 * Lần đầu gặp một nguồn chỉ ghi vị trí (0 bước), tránh phát tiếng khi nhân viên vừa xuất hiện.
 */
export class FootstepTracker {
  private readonly last = new Map<string, Point>();
  private readonly carry = new Map<string, number>();

  advance(id: string, pos: Point): number {
    const prev = this.last.get(id);
    this.last.set(id, { x: pos.x, y: pos.y });
    if (!prev || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return 0;
    const moved = Math.hypot(pos.x - prev.x, pos.y - prev.y);
    if (moved > FOOTSTEP_RULES.maxJump) { this.carry.set(id, 0); return 0; }
    const total = (this.carry.get(id) ?? 0) + moved;
    const steps = Math.min(FOOTSTEP_RULES.maxStepsPerSample, Math.floor(total / FOOTSTEP_RULES.stepDistance));
    this.carry.set(id, total - Math.floor(total / FOOTSTEP_RULES.stepDistance) * FOOTSTEP_RULES.stepDistance);
    return steps;
  }

  /** Bỏ các nguồn không còn tồn tại (nhân viên nghỉ việc, hết ca) để không giữ bộ nhớ. */
  retain(ids: Iterable<string>): void {
    const keep = new Set(ids);
    for (const id of [...this.last.keys()]) if (!keep.has(id)) { this.last.delete(id); this.carry.delete(id); }
  }
}
