import { Container, Graphics, Sprite } from 'pixi.js';
import {
  UMBRELLA_ATTACHMENT, UMBRELLA_CANOPY_DX, UMBRELLA_FRAME, WEATHER_CONFIG,
  raincoatFrameName, roofProximityAt, shelterZoneAt, umbrellaFrameName,
  type RaincoatPose, type UmbrellaSpriteState, type WindLean,
} from '@game/data';
import { getRainProtection, rainGearProfile, umbrellaAnimState, type RainProtection, type UmbrellaAnimState, type WeatherVisualState } from '@game/core';
import { raincoatTexture, umbrellaTexture, weatherSpritesReady } from './weather-sprites';

/**
 * Ô và áo mưa là sprite pixel riêng (`weather-sprites.ts`), con của container nhân vật nên đi cùng và sắp theo chiều sâu
 * cùng nhân vật. Lớp này chỉ chọn khung/hướng/điểm gắn từ trạng thái thời tiết; quyết định có dùng đồ che hay không nằm
 * ở `@game/core` (`getRainProtection`). Tóc/vạt áo bay (`drawWisps`) và giọt bắn trên ô là lớp phủ vài điểm ảnh bằng mã.
 */
/** Đang ở trong một công trình (trong nhà thì đóng ô, cởi áo mưa). Cùng dữ liệu khu trú với hành vi trú mưa và nước mái. */
export function isUnderRoof(x: number, y: number): boolean {
  return shelterZoneAt(x, y)?.kind === 'building';
}

/** Độ gần mái 0..1 theo `SHELTER_ZONES` (xem `roofProximityAt`). */
export const roofProximity = (x: number, y: number, reach = 160): number => roofProximityAt(x, y, reach);

export type GearFacing = 'left' | 'right' | 'up' | 'down';

export interface GearFrame {
  dt: number;
  time: number;
  characterId: string;
  day: number;
  x: number;
  y: number;
  facing: GearFacing;
  walking: boolean;
  weather: WeatherVisualState | null;
  /** Hiệu ứng thời tiết bật; tắt thì mọi người bỏ đồ che. */
  enabled: boolean;
  reducedMotion: boolean;
  /** Cho phép tóc/áo bay theo gió. */
  windEffects: boolean;
}

/** Gió còn lại dưới mái hiên (nhân vật được che một phần). */
const AWNING_WIND_SCALE = 0.35;

export class RainGear {
  readonly container = new Container();
  private coat = new Sprite();
  private wisps = new Graphics();
  private wispKey = '';
  /** Trạng thái hoạt ảnh ô hiện tại (closed/opening/open_idle/open_walk/wind_light/wind_strong/closing). */
  umbrellaState: UmbrellaAnimState = 'closed';
  /** Vị trí nhân vật so với công trình: 'building' (trong nhà), 'awning' (dưới mái hiên), null (ngoài trời). */
  shelter: 'building' | 'awning' | null = null;
  private umbrella = new Sprite();
  private drips = new Graphics();
  private dripKey = '';
  private kind: Exclude<RainProtection, 'none'> = 'umbrella';
  private open = 0;
  private coatAmt = 0;

  constructor() {
    this.container.eventMode = 'none';
    this.coat.anchor.set(0.5, 1);
    this.container.addChild(this.coat, this.wisps, this.umbrella, this.drips);
    this.container.visible = false;
  }

  update(f: GearFrame): void {
    const w = f.weather;
    const zone = shelterZoneAt(f.x, f.y);
    this.shelter = zone ? zone.kind : isUnderRoof(f.x, f.y) ? 'building' : null;
    const want: RainProtection = f.enabled && w && this.shelter !== 'building' ? getRainProtection(w, { id: f.characterId }, f.day) : 'none';
    if (want !== 'none' && want !== this.kind) {
      // Đổi loại đồ che: bỏ cái cũ ngay, không giữ cả hai.
      if (this.open > 0 || this.coatAmt > 0) { this.open = 0; this.coatAmt = 0; }
      this.kind = want;
    }
    const rate = WEATHER_CONFIG.protection.openRate * f.dt;
    // Dưới mái hiên: ô đóng lại (vẫn cầm trên tay), áo mưa giữ nguyên.
    const wantOpen = want === 'umbrella' && this.shelter !== 'awning';
    this.open = this.shelter === 'building' ? 0 : this.approach(this.open, wantOpen ? 1 : 0, rate); // vào nhà là bỏ ô ngay, không để lơ lửng
    this.coatAmt = this.shelter === 'building' ? 0 : this.approach(this.coatAmt, want === 'raincoat' ? 1 : 0, rate * 2);
    const windRaw = w?.windIntensity ?? 0;
    const wind = this.shelter === 'awning' ? windRaw * AWNING_WIND_SCALE : windRaw;
    const dirX = Math.cos(w?.windDirection ?? 0);
    const lean: WindLean = dirX >= 0 ? 'R' : 'L';
    const holdsClosed = want === 'umbrella' && !wantOpen;
    const showUmbrella = weatherSpritesReady() && (this.open > 0.03 || holdsClosed);
    const showCoat = weatherSpritesReady() && this.coatAmt > 0.5;
    this.umbrellaState = umbrellaAnimState(this.open, wantOpen, f.walking, wind);
    // Gió lay tóc và áo: chỉ ngoài trời (không dưới mái), gió đủ mạnh, và không mặc áo mưa (áo mưa có vạt/mũ riêng).
    const showWisps = f.windEffects && !showCoat && windRaw >= 0.18 && this.shelter === null;
    this.container.visible = showUmbrella || showCoat || showWisps;
    this.umbrella.visible = showUmbrella;
    this.coat.visible = showCoat;
    this.wisps.visible = showWisps;
    this.drips.visible = false;
    if (!this.container.visible) return;
    if (showWisps) this.drawWisps(f, windRaw, dirX);

    const profile = rainGearProfile(f.characterId, f.day);
    const dir = f.facing as 'left' | 'right' | 'up' | 'down';
    if (showUmbrella) this.placeUmbrella(f, dir, profile.umbrellaColor, lean, w?.rainIntensity ?? 0);
    if (showCoat) this.placeCoat(f, dir, profile.coatColor, wind, lean);
  }

  /** Chỉ số khung theo nhịp, trùng nhịp hoạt ảnh nhân vật (đứng 1,5 khung/s ×2 khung, đi 8 khung/s ×4 khung). */
  private idleFrame(f: GearFrame): number { return f.reducedMotion ? 0 : Math.floor(f.time * 1.5) % 2; }
  private walkFrame(f: GearFrame): number { return f.reducedMotion ? 0 : Math.floor(f.time * 8) % 4; }

  private placeUmbrella(f: GearFrame, dir: GearFacing, color: string, lean: WindLean, rain: number): void {
    const st = this.umbrellaState;
    let state: UmbrellaSpriteState = 'closed';
    let leanKey: WindLean | '-' = '-';
    let i = 0;
    switch (st) {
      case 'closed': state = 'closed'; break;
      case 'opening': case 'closing': state = 'opening'; i = Math.max(0, Math.min(2, Math.floor(this.open * 3))); break;
      case 'open_idle': state = 'open_idle'; i = this.idleFrame(f); break;
      case 'open_walk': state = 'open_walk'; i = this.walkFrame(f); break;
      case 'wind_light': state = 'wind_light'; leanKey = lean; i = f.reducedMotion ? 0 : Math.floor(f.time * 6) % 4; break;
      case 'wind_strong': state = 'wind_strong'; leanKey = lean; i = f.reducedMotion ? 0 : Math.floor(f.time * 12) % 5; break;
    }
    const tex = umbrellaTexture(color, umbrellaFrameName(dir, state, leanKey, i));
    this.umbrella.visible = tex !== null;
    if (!tex) return;
    this.umbrella.texture = tex;
    const att = UMBRELLA_ATTACHMENT[dir];
    // Điểm nắm của khung trùng điểm tay cầm của hướng nhìn này; vị trí nguyên để giữ điểm ảnh sắc nét.
    this.umbrella.position.set(att.x - UMBRELLA_FRAME.gripX, att.y - UMBRELLA_FRAME.gripY);
    if (st === 'open_idle' || st === 'open_walk') this.drawDrips(f, dir, rain);
  }

  /** Giọt nước bắn từ mép ô khi mưa to: vài điểm ảnh nhấp nháy, chỉ khi ô đang mở thẳng. */
  private drawDrips(f: GearFrame, dir: GearFacing, rain: number): void {
    if (f.reducedMotion || rain < 0.4) return;
    const phase = Math.floor(f.time * 9) % 3;
    const key = `${dir}|${phase}`;
    this.drips.visible = true;
    if (key === this.dripKey) return;
    this.dripKey = key;
    const cx = UMBRELLA_ATTACHMENT[dir].x + UMBRELLA_CANOPY_DX[dir];
    const rimY = UMBRELLA_ATTACHMENT[dir].y - 24;
    const g = this.drips;
    g.clear();
    const c = { color: 0xcfe8f5, alpha: 0.9 };
    for (const side of [-1, 1]) g.rect(cx + side * (16 + phase), rimY + 1 + phase * 2, 1, 1).fill(c);
    g.rect(cx + (phase - 1) * 6, rimY - 11 + phase, 1, 1).fill(c);
  }

  private placeCoat(f: GearFrame, dir: GearFacing, color: string, wind: number, lean: WindLean): void {
    const pose: RaincoatPose = f.walking ? (`walk${this.walkFrame(f)}` as RaincoatPose) : (`idle${this.idleFrame(f)}` as RaincoatPose);
    const windState = wind >= 0.6 ? 'wind_strong' : wind >= 0.25 ? 'wind_light' : null;
    const name = windState
      ? raincoatFrameName(dir, windState, lean, pose, f.reducedMotion ? 0 : Math.floor(f.time * (windState === 'wind_strong' ? 8 : 4)) % (windState === 'wind_strong' ? 3 : 2))
      : raincoatFrameName(dir, f.walking ? 'walk' : 'idle', '-', pose, 0);
    const tex = raincoatTexture(color, name);
    this.coat.visible = tex !== null;
    if (tex) this.coat.texture = tex;
  }

  /**
   * Tóc bay và vạt áo rung: vài điểm ảnh ở đỉnh đầu và mép áo nghiêng theo hướng gió (gió nhẹ rung nhẹ, gió mạnh bay rõ).
   * Là lớp phủ nhỏ trên sprite có sẵn, không biến dạng thân nhân vật.
   */
  private drawWisps(f: GearFrame, wind: number, dirX: number): void {
    const flick = f.reducedMotion ? 0 : Math.round(Math.sin(f.time * (6 + wind * 10) + f.x * 0.05) * (wind > 0.5 ? 2 : 1));
    const lean = Math.round(dirX * (1 + wind * 3)) + flick;
    const key = `${lean}|${f.facing}|${wind > 0.5 ? 1 : 0}`;
    if (key === this.wispKey) return;
    this.wispKey = key;
    const g = this.wisps;
    g.clear();
    const hair = 0x2b1d14;
    const hairLen = wind > 0.5 ? 3 : 2;
    for (const x of [-3, -1, 2]) g.rect(x + Math.round(lean / 2), -43 - (x === -1 ? 1 : 0), 1, 1).fill(hair);
    for (let i = 1; i <= hairLen; i++) g.rect(-4 + Math.round((lean * i) / hairLen), -42 + (i > 2 ? 1 : 0), 1, 1).fill(hair);
    // Vạt áo: mảnh nhỏ ở sườn dưới thân, bay về phía gió.
    const side = dirX >= 0 ? 6 : -7;
    g.rect(side + Math.round(lean / 2), -21, 2, 2).fill({ color: 0xd8d0bf, alpha: 0.85 });
    if (wind > 0.5) g.rect(side + lean, -19, 2, 1).fill({ color: 0xd8d0bf, alpha: 0.75 });
  }

  private approach(cur: number, target: number, step: number): number {
    return cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
  }
}
