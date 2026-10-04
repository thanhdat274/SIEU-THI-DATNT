import { Assets, Rectangle, Texture } from 'pixi.js';
import { RAINCOAT_COLOR_NAMES, UMBRELLA_COLOR_NAMES } from '@game/data';

/**
 * Bộ sprite pixel ô/áo mưa (PNG sinh bởi `tools/weather-sprites`, xuất vào `apps/web/public/assets/weather`).
 * Chỉ nạp và cắt khung; không chứa logic thời tiết. Chưa nạp xong thì `get*` trả null và RainGear không vẽ đồ che
 * (không quay về bản vẽ bằng mã).
 */
interface Manifest { frameW: number; frameH: number; frames: Record<string, { x: number; y: number }> }

class SheetSet {
  private manifest: Manifest | null = null;
  private sheets = new Map<string, Texture>();
  private cache = new Map<string, Texture>();
  constructor(private readonly kind: 'umbrella' | 'raincoat', private readonly colors: readonly string[]) {}

  async load(base: string): Promise<void> {
    const res = await fetch(`${base}${this.kind}/manifest.json`);
    this.manifest = await res.json() as Manifest;
    await Promise.all(this.colors.map(async (color) => {
      const tex = await Assets.load<Texture>(`${base}${this.kind}/${this.kind}_${color}.png`);
      tex.source.scaleMode = 'nearest';
      this.sheets.set(color, tex);
    }));
  }

  get ready(): boolean { return this.manifest !== null && this.sheets.size === this.colors.length; }

  frame(color: string, name: string): Texture | null {
    const m = this.manifest; const sheet = this.sheets.get(color);
    const pos = m?.frames[name];
    if (!m || !sheet || !pos) return null;
    const key = `${color}|${name}`;
    let t = this.cache.get(key);
    if (!t) {
      t = new Texture({ source: sheet.source, frame: new Rectangle(pos.x, pos.y, m.frameW, m.frameH) });
      this.cache.set(key, t);
    }
    return t;
  }
}

const umbrellas = new SheetSet('umbrella', UMBRELLA_COLOR_NAMES);
const raincoats = new SheetSet('raincoat', RAINCOAT_COLOR_NAMES);
let loading: Promise<void> | null = null;

export function loadWeatherSprites(): Promise<void> {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  const base = `${env?.BASE_URL ?? '/'}assets/weather/`;
  loading ??= Promise.all([umbrellas.load(base), raincoats.load(base)]).then(() => undefined).catch((err) => { loading = null; console.warn('weather sprites failed to load', err); });
  return loading;
}

export const weatherSpritesReady = (): boolean => umbrellas.ready && raincoats.ready;
export const umbrellaTexture = (color: string, name: string): Texture | null => umbrellas.frame(color, name);
export const raincoatTexture = (color: string, name: string): Texture | null => raincoats.frame(color, name);
