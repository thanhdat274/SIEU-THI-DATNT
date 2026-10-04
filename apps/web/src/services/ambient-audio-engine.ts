import { AmbientMix, AudioSettings, DEFAULT_AUDIO_SETTINGS, masterGain, sanitizeAudioSettings } from '@game/core';

const SETTINGS_KEY = 'tiem-tap-hoa:audio';

export const loadAudioSettings = (): AudioSettings => {
  try { return sanitizeAudioSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')); } catch { return { ...DEFAULT_AUDIO_SETTINGS }; }
};
const saveAudioSettings = (settings: AudioSettings): void => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* bỏ qua */ }
};

/** Âm thanh môi trường tổng hợp bằng Web Audio (nhiễu lọc), không dùng file. Chỉ tạo AudioContext sau user gesture. */
export class AmbientAudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private layers: { rain?: GainNode; street?: GainNode; night?: GainNode; wind?: GainNode; roof?: GainNode; birds?: GainNode } = {};
  private settings = loadAudioSettings();
  private gestured = false;
  private mix: AmbientMix = { rain: 0, street: 0, night: 0, wind: 0, birds: 0, roof: 0 };
  private readonly onGesture = () => this.start();
  private readonly onVisibility = () => this.apply();

  attach(): void {
    window.addEventListener('pointerdown', this.onGesture, { once: true });
    window.addEventListener('keydown', this.onGesture, { once: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Tiếng chim: các tràng chiêm chiếp ngắn, cách nhau ngẫu nhiên 2–9 giây; âm lượng do lớp `birds` fade theo thời tiết. */
  private birdTimer?: number;
  private scheduleBird(): void {
    window.clearTimeout(this.birdTimer);
    this.birdTimer = window.setTimeout(() => {
      const ctx = this.ctx;
      if (ctx && ctx.state === 'running' && this.layers.birds && this.mix.birds > 0.03) this.chirp(ctx, this.layers.birds);
      if (this.ctx) this.scheduleBird();
    }, 2000 + Math.random() * 7000);
  }

  private chirp(ctx: AudioContext, destination: AudioNode): void {
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2400 + Math.random() * 2200;
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const f0 = base * (0.9 + Math.random() * 0.3);
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * (Math.random() < 0.5 ? 1.35 : 0.75), t + 0.07);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.09);
      osc.connect(gain).connect(destination);
      osc.start(t);
      osc.stop(t + 0.1);
      t += 0.1 + Math.random() * 0.08;
    }
  }

  detach(): void {
    window.clearTimeout(this.birdTimer);
    window.removeEventListener('pointerdown', this.onGesture);
    window.removeEventListener('keydown', this.onGesture);
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx?.close();
    this.ctx = undefined;
  }

  getSettings(): AudioSettings { return { ...this.settings }; }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    saveAudioSettings(this.settings);
    this.apply();
  }

  setMix(mix: AmbientMix): void {
    this.mix = mix;
    this.apply();
  }

  /** Sấm: nhiễu trầm tắt dần. `strength` 0..1. Không phát nếu chưa có gesture, đang tắt tiếng hoặc tab ẩn. */
  thunder(strength: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    if (masterGain(this.settings, { userGestured: this.gestured, pageVisible: document.visibilityState === 'visible' }) === 0) return;
    const level = Math.max(0, Math.min(1, strength));
    const length = 2.4;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160 + 120 * level;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.9 * level, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
  }

  private noiseLayer(ctx: AudioContext, destination: AudioNode, type: BiquadFilterType, frequency: number): GainNode {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(destination);
    source.start();
    return gain;
  }

  private start(): void {
    this.gestured = true;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.layers.rain = this.noiseLayer(this.ctx, this.master, 'highpass', 1500);
      this.layers.street = this.noiseLayer(this.ctx, this.master, 'lowpass', 400);
      this.layers.night = this.noiseLayer(this.ctx, this.master, 'bandpass', 4200);
      this.layers.wind = this.noiseLayer(this.ctx, this.master, 'bandpass', 520);
      // Mưa trên mái: nhiễu dải giữa-cao, gõ lách tách khác tiếng mưa ngoài trời.
      this.layers.roof = this.noiseLayer(this.ctx, this.master, 'bandpass', 2600);
      this.layers.birds = this.ctx.createGain();
      this.layers.birds.gain.value = 0;
      this.layers.birds.connect(this.master);
      this.scheduleBird();
    }
    this.apply();
  }

  private apply(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const gain = masterGain(this.settings, { userGestured: this.gestured, pageVisible: document.visibilityState === 'visible' });
    const now = ctx.currentTime;
    this.master.gain.setTargetAtTime(gain * 0.25, now, 0.2);
    this.layers.rain?.gain.setTargetAtTime(this.mix.rain, now, 0.5);
    this.layers.street?.gain.setTargetAtTime(this.mix.street, now, 0.5);
    this.layers.night?.gain.setTargetAtTime(this.mix.night * 0.3, now, 0.5);
    this.layers.wind?.gain.setTargetAtTime(this.mix.wind * 0.9, now, 0.8);
    this.layers.roof?.gain.setTargetAtTime(this.mix.roof * 0.7, now, 0.6);
    this.layers.birds?.gain.setTargetAtTime(this.mix.birds, now, 2.5);
    if (gain === 0 && ctx.state === 'running') void ctx.suspend();
    else if (gain > 0 && ctx.state === 'suspended') void ctx.resume();
  }
}
