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
  private layers: { rain?: GainNode; street?: GainNode; night?: GainNode } = {};
  private settings = loadAudioSettings();
  private gestured = false;
  private mix: AmbientMix = { rain: 0, street: 0, night: 0 };
  private readonly onGesture = () => this.start();
  private readonly onVisibility = () => this.apply();

  attach(): void {
    window.addEventListener('pointerdown', this.onGesture, { once: true });
    window.addEventListener('keydown', this.onGesture, { once: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  detach(): void {
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
    if (gain === 0 && ctx.state === 'running') void ctx.suspend();
    else if (gain > 0 && ctx.state === 'suspended') void ctx.resume();
  }
}
