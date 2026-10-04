import { WEATHER_BASE_BY_ID, WEATHER_CONFIG, WEATHER_PRESETS, type WeatherPresetId, type WeatherTargets } from '@game/data';
import { Mulberry32Rng } from './staff';
import { hashSeed } from './weather';

/**
 * Mô hình hiệu ứng thời tiết thuần (không Pixi, không DOM): làm mượt cường độ mưa/gió/mây từ mô phỏng, dựng gió giật,
 * mực nước vũng, chuỗi sấm chớp có độ trễ, và cho phép debug ép một trạng thái với thời gian chuyển. Không đổi gameplay.
 */
export type WeatherVisualType = 'clear' | 'cloudy' | 'rain_light' | 'rain' | 'rain_heavy' | 'storm' | 'wind_light' | 'wind_strong';

export interface WeatherVisualState {
  type: WeatherVisualType;
  rainIntensity: number;
  /** Gió đã gồm gió giật. */
  windIntensity: number;
  /** Radian; 0 = gió thổi từ trái sang phải, dương = hướng xuống dưới màn hình. */
  windDirection: number;
  cloudIntensity: number;
  /** Độ tối chung do mây + mưa, 0..1. */
  darkness: number;
  lightningIntensity: number;
  /** Mực nước vũng 0..1: dâng nhanh khi mưa, cạn rất chậm khi tạnh. */
  puddleLevel: number;
  /** Mây che nắng 0..1 (mây trôi qua mặt trời). */
  sunOcclusion: number;
  fog: number;
  /** Thời gian chuyển đang áp dụng (giây). */
  transitionDuration: number;
}

export interface WeatherVisualInput {
  /** Cường độ mưa tức thời từ mô phỏng. */
  rain: number;
  /** Cường độ mưa sắp tới (vài chục phút nữa) để mây/gió lên trước mưa. */
  rainAhead: number;
  weatherId: string;
  day: number;
  /** Độ ướt mặt đường 0..1 từ mô phỏng (đã khô dần theo giờ game). */
  wetness: number;
}

export interface ThunderEvent { strength: number }

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const slew = (cur: number, target: number, maxStep: number) => cur + Math.max(-maxStep, Math.min(maxStep, target - cur));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function weatherTypeOf(rain: number, wind: number, cloud: number, thunderstorm: boolean): WeatherVisualType {
  const tiers = WEATHER_CONFIG.rainTiers;
  if (thunderstorm && rain >= tiers.heavy) return 'storm';
  if (rain >= tiers.heavy) return 'rain_heavy';
  if (rain >= tiers.normal) return 'rain';
  if (rain >= 0.07) return 'rain_light';
  if (wind >= 0.6) return 'wind_strong';
  if (wind >= 0.25) return 'wind_light';
  if (cloud >= 0.5) return 'cloudy';
  return 'clear';
}

export class WeatherVisualModel {
  private rng: Mulberry32Rng;
  private time = 0;
  private rain = 0;
  private wind = 0;
  private cloud = 0.1;
  private puddle = 0;
  private flashTimeline: Array<{ end: number; level: number }> = [];
  private flashClock = 0;
  private nextStrikeIn: number;
  private thunderQueue: Array<{ at: number; strength: number }> = [];
  private firedThunder: ThunderEvent[] = [];
  private override: { targets: WeatherTargets; duration: number } | null = null;
  private overrideWind: number | null = null;
  private overrideDirection: number | null = null;
  private darknessOverride: number | null = null;
  private lastDay = -1;
  private baseDirection = 0;
  private transitionSec: number = WEATHER_CONFIG.transition.defaultSec;
  private state: WeatherVisualState;

  constructor(private seed: string) {
    this.rng = new Mulberry32Rng(hashSeed(`${seed}:wx`));
    this.nextStrikeIn = this.rollInterval();
    this.state = this.snapshot(0, 0, 0);
  }

  /** Đặt lại hạt giống (cùng hạt giống + cùng chuỗi input cho cùng chuỗi sấm chớp, để tái hiện khi debug). */
  reseed(seed: string): void {
    this.seed = seed;
    this.rng = new Mulberry32Rng(hashSeed(`${seed}:wx`));
    this.nextStrikeIn = this.rollInterval();
    this.flashTimeline = [];
    this.thunderQueue = [];
  }

  getState(): WeatherVisualState { return this.state; }

  /** Ép trạng thái (debug/kịch bản) rồi chuyển dần trong `durationMs`; không đổi mô phỏng. */
  transitionWeather(preset: WeatherPresetId, durationMs: number = WEATHER_CONFIG.transition.defaultSec * 1000): void {
    this.transitionToTargets(WEATHER_PRESETS[preset], durationMs);
  }

  /** Như transitionWeather nhưng với mục tiêu tùy ý (slider debug). */
  transitionToTargets(targets: WeatherTargets, durationMs: number): void {
    this.override = { targets: { ...targets }, duration: Math.max(0.1, durationMs / 1000) };
    this.transitionSec = this.override.duration;
  }

  setWindOverride(intensity: number | null, direction: number | null): void {
    this.overrideWind = intensity === null ? null : clamp01(intensity);
    this.overrideDirection = direction;
  }

  clearOverride(): void {
    this.override = null;
    this.overrideWind = null;
    this.overrideDirection = null;
    this.transitionSec = WEATHER_CONFIG.transition.defaultSec;
  }

  /** Debug: ép độ tối (0..1) bất kể mây/mưa; null = tự suy ra. Chỉ bảng debug dev gọi. */
  setDarknessOverride(value: number | null): void { this.darknessOverride = value === null ? null : clamp01(value); }

  getDarknessOverride(): number | null { return this.darknessOverride; }

  hasOverride(): boolean { return this.override !== null; }

  /** Kích một loạt chớp ngay (debug); sấm vẫn đến trễ. */
  triggerLightning(): void { this.startStrike(); }

  /** Lấy các tiếng sấm đã đến hạn từ lần gọi trước. */
  consumeThunders(): ThunderEvent[] {
    const out = this.firedThunder;
    this.firedThunder = [];
    return out;
  }

  private rollInterval(): number {
    const cfg = WEATHER_CONFIG.lightning;
    return cfg.minInterval + this.rng.next() * (cfg.maxInterval - cfg.minInterval);
  }

  private startStrike(): void {
    const cfg = WEATHER_CONFIG.lightning;
    const pattern = cfg.patterns[Math.floor(this.rng.next() * cfg.patterns.length)];
    let t = this.flashClock;
    this.flashTimeline = [];
    for (const [duration, level] of pattern) { t += duration; this.flashTimeline.push({ end: t, level }); }
    const delay = cfg.thunderDelayMin + this.rng.next() * (cfg.thunderDelayMax - cfg.thunderDelayMin);
    // Chớp càng xa (trễ càng lâu) sấm càng nhỏ.
    const strength = clamp01(1.05 - (delay - cfg.thunderDelayMin) / (cfg.thunderDelayMax - cfg.thunderDelayMin) * 0.6);
    this.thunderQueue.push({ at: this.flashClock + delay, strength });
  }

  update(dtRaw: number, input: WeatherVisualInput): WeatherVisualState {
    const dt = Math.max(0, Math.min(0.25, Number.isFinite(dtRaw) ? dtRaw : 0));
    this.time += dt;
    this.flashClock += dt;
    const cfg = WEATHER_CONFIG;

    if (input.day !== this.lastDay) {
      this.lastDay = input.day;
      const h = new Mulberry32Rng(hashSeed(`${this.seed}:wind:${input.day}`)).next();
      this.baseDirection = (h - 0.5) * 2 * cfg.wind.directionSpread;
    }

    // Mục tiêu: từ debug preset hoặc từ mô phỏng (mây và gió nhích lên trước khi mưa đến).
    let tRain: number; let tWind: number; let tCloud: number; let thunderstorm: boolean; let tPuddle: number;
    if (this.override) {
      const p = this.override.targets;
      tRain = p.rain; tWind = p.wind; tCloud = p.cloud; thunderstorm = p.lightning;
      // Vũng chỉ dâng khi mưa thật sự đang rơi (tính sau khi cập nhật this.rain, bên dưới).
      tPuddle = Number.NaN;
    } else {
      const base = WEATHER_BASE_BY_ID[input.weatherId] ?? { cloud: 0.2, wind: 0.1 };
      const rain = clamp01(input.rain);
      const ahead = clamp01(input.rainAhead);
      tRain = rain;
      tCloud = Math.max(base.cloud, rain * 0.6 + 0.4, ahead * 0.9 + 0.1);
      if (rain < 0.02 && ahead < 0.05) tCloud = base.cloud;
      tWind = Math.min(1, base.wind + Math.max(rain, ahead) * 0.25);
      thunderstorm = input.weatherId === 'storm';
      tPuddle = clamp01(input.wetness);
    }
    if (this.overrideWind !== null) tWind = this.overrideWind;

    const tr = this.override ? this.override.duration : cfg.transition.defaultSec;
    // Thứ tự diễn biến: mây dày lên trước, rồi gió, mưa chỉ lớn dần khi mây đã đủ dày.
    this.cloud = slew(this.cloud, tCloud, dt / (this.override ? tr : cfg.transition.cloudSec));
    this.wind = slew(this.wind, tWind, dt / (this.override ? tr * 0.8 : cfg.transition.windSec));
    const cloudGate = this.override ? smoothstep(0.55, 0.95, this.cloud / Math.max(0.2, tCloud)) : 1;
    this.rain = slew(this.rain, tRain * cloudGate, dt / (this.override ? tr : cfg.transition.rainSec));

    // Vũng nước: dâng khi có mưa, cạn rất chậm (không biến mất ngay khi tạnh).
    if (Number.isNaN(tPuddle)) tPuddle = this.rain < 0.08 ? 0 : clamp01((this.rain - 0.08) * 1.5);
    const rate = tPuddle > this.puddle ? cfg.puddle.riseRate : cfg.puddle.fallRate;
    this.puddle = slew(this.puddle, tPuddle, dt * rate);

    const gustPhase = this.time * (Math.PI * 2 / cfg.wind.gustPeriodSec);
    const gust = 1 + cfg.wind.gustAmplitude * (0.6 * Math.sin(gustPhase) + 0.4 * Math.sin(gustPhase * 2.7 + 1.1)) * Math.min(1, this.wind * 2);
    const windEff = clamp01(this.wind * gust);
    const direction = this.overrideDirection ?? (this.baseDirection + 0.12 * Math.sin(this.time * 0.05));

    // Sấm chớp: chỉ trong giông đủ mưa; chuỗi chớp rất ngắn, có khoảng ngẫu nhiên.
    if (thunderstorm && this.rain > 0.55) {
      this.nextStrikeIn -= dt;
      if (this.nextStrikeIn <= 0) { this.startStrike(); this.nextStrikeIn = this.rollInterval(); }
    }
    while (this.flashTimeline.length && this.flashTimeline[0].end <= this.flashClock) this.flashTimeline.shift();
    const flash = this.flashTimeline.length ? this.flashTimeline[0].level : 0;
    for (let i = this.thunderQueue.length - 1; i >= 0; i--) {
      if (this.thunderQueue[i].at <= this.flashClock) {
        this.firedThunder.push({ strength: this.thunderQueue[i].strength });
        this.thunderQueue.splice(i, 1);
      }
    }

    this.state = this.snapshot(windEff, direction, flash, thunderstorm, input.weatherId === 'special');
    return this.state;
  }

  private snapshot(windEff: number, direction: number, flash: number, thunderstorm = false, mist = false): WeatherVisualState {
    const cfg = WEATHER_CONFIG;
    // Mây trôi qua mặt trời: dao động chậm, biên độ theo độ dày mây.
    const pass = 0.5 + 0.5 * Math.sin(this.time * 0.09 + 1.3) * Math.sin(this.time * 0.037 + 0.4);
    const sunOcclusion = clamp01(this.cloud * (0.45 + 0.7 * pass));
    const darkness = Math.min(cfg.darkness.max, (this.cloud * cfg.darkness.fromCloud + this.rain * cfg.darkness.fromRain) * (0.82 + 0.18 * pass));
    const darknessFinal = this.darknessOverride ?? darkness;
    const fog = clamp01(Math.max(0, (this.rain - 0.6) / 0.4) * 0.7 + (mist ? 0.8 : 0));
    return {
      type: weatherTypeOf(this.rain, this.wind, this.cloud, thunderstorm),
      rainIntensity: this.rain,
      windIntensity: windEff,
      windDirection: direction,
      cloudIntensity: this.cloud,
      darkness: darknessFinal,
      lightningIntensity: flash,
      puddleLevel: this.puddle,
      sunOcclusion,
      fog,
      transitionDuration: this.transitionSec,
    };
  }
}

/** Vận tốc ngang/dọc của giọt mưa (px/s): gió đẩy ngang theo hướng gió, gió mạnh làm rơi nhanh hơn. */
export function rainVelocity(rain: number, wind: number, direction: number): { vx: number; vy: number } {
  const r = WEATHER_CONFIG.rain;
  const base = r.speedMin + (r.speedMax - r.speedMin) * clamp01(rain);
  return { vx: Math.cos(direction) * wind * r.windPush, vy: base + wind * r.windFallBoost + Math.sin(direction) * wind * r.windFallBoost * 0.5 };
}

export type WindObjectKind = keyof typeof WEATHER_CONFIG.wind.response;

/** Độ lệch của một vật theo gió; building luôn 0. */
export function windSway(kind: WindObjectKind, wind: number, time: number, phase = 0): number {
  const response = WEATHER_CONFIG.wind.response[kind];
  if (response <= 0) return 0;
  const freq = 1.3 + wind * 3;
  return response * wind * (0.6 + 0.4 * Math.sin(time * freq + phase)) * Math.sin(time * freq * 0.7 + phase * 1.7);
}
