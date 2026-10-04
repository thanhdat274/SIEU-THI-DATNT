import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { TILE_SIZE } from '@game/shared';
import { ROAD_PROFILE, ROOF_EAVES, STORM_DRAINS, WEATHER_CONFIG, isAwningOpen, shelterZoneAt, type WeatherQuality } from '@game/data';
import { rainVelocity, windSway, type WeatherVisualState } from '@game/core';
import { puddleGeometry } from './road-surface';

/**
 * Lớp vẽ hiệu ứng thời tiết (pixel art): mưa bằng sprite 1 px được pool, giọt bắn và gợn nước lấy mẫu một phần, lá/giấy bay,
 * bóng mây trôi, phủ tối/sương nhẹ và chớp. Không giữ trạng thái thời tiết: nhận WeatherVisualState mỗi khung từ game-core.
 * Gió, hướng gió, mưa dùng chung một vector nên mọi hiệu ứng đồng hướng.
 */
export interface WeatherView { left: number; top: number; width: number; height: number }

export interface WeatherFrameContext {
  dt: number;
  time: number;
  /** Độ nắng 0..1 của ánh sáng ngày/đêm hiện tại. */
  sun: number;
  /** Độ sáng của đèn đường (0 ban ngày, 1 ban đêm). */
  night: number;
  quality: WeatherQuality;
  /** Cường độ người chơi chọn 0..1. */
  userIntensity: number;
  reducedMotion: boolean;
  mapWidthPx: number;
  mapHeightPx: number;
  /** Chân các nhân vật (để bắn nước khi đi qua vũng). */
  actors: ReadonlyArray<{ x: number; y: number }>;
}

interface Drop { x: number; y: number; groundY: number; near: boolean; sprite: Sprite }
interface Splash { x: number; y: number; age: number; wind: number }
interface Ripple { x: number; y: number; age: number; max: number }
interface Debris { x: number; y: number; phase: number; kind: 'leaf' | 'paper'; color: number }

const LEAF_COLORS = [0x6b8e3a, 0x8a6a2b, 0xb08a35, 0x5f7f34];
const PAPER_COLOR = 0xe8e4d4;
const KERB_Y = ROAD_PROFILE.kerbTileY * TILE_SIZE;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export class WeatherEffects {
  /** Nằm dưới thực thể, trên mặt đất: bóng mây, gợn nước, phản chiếu trên vũng. */
  readonly groundLayer = new Container();
  /** Nước chảy từ mái hiên: trên tường, dưới thực thể. */
  readonly roofLayer = new Container();
  /** Phủ tối và sương, đặt dưới lớp đèn để đèn cửa tiệm nổi bật. */
  readonly darknessLayer = new Container();
  /** Mưa, giọt bắn, lá bay, chớp: trên cùng, không bắt sự kiện chuột. */
  readonly topLayer = new Container();

  private cloudG = new Graphics();
  private roofG = new Graphics();
  private skyG = new Graphics();
  private puddleG = new Graphics();
  private darkSprite = new Sprite(Texture.WHITE);
  private fogSprite = new Sprite(Texture.WHITE);
  private flashSprite = new Sprite(Texture.WHITE);
  private dropLayer = new Container();
  private fxG = new Graphics();
  private drops: Drop[] = [];
  private splashes: Splash[] = [];
  private ripples: Ripple[] = [];
  private debris: Debris[] = [];
  private rippleBudget = 0;
  private actorCooldown = 0;
  private shake = 0;
  private frameEma = 16;
  private perfClock = 0;
  /** Hệ số mật độ tự giảm khi khung hình chậm. */
  private perfFactor = 1;

  constructor() {
    for (const layer of [this.groundLayer, this.roofLayer, this.darknessLayer, this.topLayer]) layer.eventMode = 'none';
    this.roofLayer.addChild(this.roofG);
    this.groundLayer.addChild(this.cloudG, this.puddleG);
    this.darkSprite.tint = WEATHER_CONFIG.darkness.color;
    this.fogSprite.tint = WEATHER_CONFIG.fog.color;
    this.flashSprite.tint = WEATHER_CONFIG.lightning.flashColor;
    for (const s of [this.darkSprite, this.fogSprite, this.flashSprite]) s.alpha = 0;
    this.darknessLayer.addChild(this.darkSprite, this.fogSprite);
    this.topLayer.addChild(this.skyG, this.dropLayer, this.fxG, this.flashSprite);
  }

  get adaptiveFactor(): number { return this.perfFactor; }

  /** Gọi khi có sấm: rung camera nhẹ. */
  onThunder(strength: number): void { this.shake = Math.max(this.shake, clamp01(strength)); }

  /** Độ lệch rung camera theo px màn hình (số nguyên, để pixel art không nhòe). */
  shakeOffset(zoom: number, reducedMotion: boolean): { x: number; y: number } {
    if (reducedMotion || this.shake < 0.02) return { x: 0, y: 0 };
    const amp = WEATHER_CONFIG.lightning.shakePx * this.shake * zoom;
    return { x: Math.round((Math.random() - 0.5) * 2 * amp), y: Math.round((Math.random() - 0.5) * 2 * amp) };
  }

  update(state: WeatherVisualState, view: WeatherView, ctx: WeatherFrameContext): void {
    const dt = Math.min(0.1, ctx.dt);
    const cfg = WEATHER_CONFIG;
    this.shake = Math.max(0, this.shake - dt / cfg.lightning.shakeDecaySec);
    this.trackPerf(dt);

    const intensity = clamp01(ctx.userIntensity) * (ctx.reducedMotion ? 0.6 : 1);
    this.topLayer.position.set(view.left, view.top);
    this.darknessLayer.position.set(view.left, view.top);
    for (const s of [this.darkSprite, this.fogSprite, this.flashSprite]) { s.width = view.width; s.height = view.height; }

    // Phủ tối: mây dày + mưa; ban đêm bớt đi vì trời đã tối sẵn.
    this.darkSprite.alpha = state.darkness * (0.35 + 0.65 * ctx.sun) * intensity;
    this.fogSprite.alpha = state.fog * cfg.fog.maxAlpha * intensity;
    const flashScale = ctx.quality === 'low' ? 0.5 : 1;
    this.flashSprite.alpha = ctx.reducedMotion ? 0 : state.lightningIntensity * cfg.lightning.flashAlpha * flashScale * (0.6 + 0.4 * intensity);

    this.updateSky(state, view, ctx, intensity);
    this.updateRoofWater(state, view, ctx, intensity);
    this.updateCloudShadows(state, view, ctx, intensity);
    this.updateRain(state, view, ctx, intensity, dt);
    this.updateDebris(state, view, ctx, intensity, dt);
    this.updatePuddles(state, ctx, intensity, dt);
    this.drawFx(state, view);
  }

  private trackPerf(dt: number): void {
    const a = WEATHER_CONFIG.adaptive;
    // Kiểm thử trên máy render phần mềm (rất chậm) cần tắt tự giảm mật độ để xem đúng hình: đặt window.__weatherNoAdaptive = true.
    if ((globalThis as { __weatherNoAdaptive?: boolean }).__weatherNoAdaptive) { this.perfFactor = 1; return; }
    this.frameEma = this.frameEma * 0.95 + dt * 1000 * 0.05;
    this.perfClock += dt;
    if (this.perfClock < 1) return;
    this.perfClock = 0;
    if (this.frameEma > a.slowFrameMs) this.perfFactor = Math.max(a.minFactor, this.perfFactor * a.stepDown);
    else if (this.frameEma < a.fastFrameMs) this.perfFactor = Math.min(1, this.perfFactor * a.stepUp);
  }

  // ---------- Mây nhìn thấy (hai lớp, parallax nhẹ) ----------
  private updateSky(state: WeatherVisualState, view: WeatherView, ctx: WeatherFrameContext, intensity: number): void {
    const g = this.skyG;
    g.clear();
    const sky = WEATHER_CONFIG.sky;
    const cloud = state.cloudIntensity;
    if (cloud < 0.04 && state.rainIntensity < 0.02) return;
    const wind = state.windIntensity;
    const dirX = Math.cos(state.windDirection);
    const dirY = Math.sin(state.windDirection) * 0.25;
    // Mây nhạt thành xám đen khi trời tối/giông.
    const dark = clamp01(state.darkness / WEATHER_CONFIG.darkness.max);
    const lerpC = (a: number, b: number, t: number) => {
      const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
      const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
      return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
    };
    // Ban đêm mây cũng tối hơn để không sáng chói giữa cảnh tối.
    // Trời quang trắng sáng; mây dày (mưa) xám; giông/đêm xám đen. `dark` đã gồm cả độ tối ép từ bảng debug.
    const overcast = lerpC(sky.colorLight, sky.colorOvercast, clamp01(cloud * 1.1));
    const color = lerpC(lerpC(overcast, sky.colorDark, dark), sky.colorDark, (1 - ctx.sun) * 0.7);
    const shadeColor = lerpC(lerpC(sky.shadeLight, sky.colorDark, clamp01(cloud * 0.6 + dark * 0.4)), sky.colorDark, (1 - ctx.sun) * 0.7);
    // Mép trên đám mây sáng hơn (viền khối), tắt dần khi trời tối; thêm hai bậc màu để đọc được hình mây dù chỉ là pixel.
    const rim = lerpC(color, 0xffffff, 0.4 * (1 - dark) * (1 - (1 - ctx.sun) * 0.7));
    const layers = [
      { count: Math.round(sky.maxBg[ctx.quality] * (0.3 + cloud * 0.7) * this.perfFactor), parallax: sky.bgParallax, speed: 3 + 14 * wind, size: 40, row: 3, alpha: sky.bgAlpha, seed: 11 },
      { count: Math.round(sky.maxFg[ctx.quality] * (0.25 + cloud * 0.75) * this.perfFactor), parallax: sky.fgParallax, speed: 8 + 90 * wind, size: 72, row: 4, alpha: sky.fgAlpha + 0.1 * dark, seed: 77 },
    ];
    const marginX = 160;
    const spanX = view.width + marginX * 2;
    const spanY = view.height + 80;
    // Hình mây tròn bậc thang: 9 hàng, bề rộng theo cung tròn.
    const rows = [0.35, 0.62, 0.82, 0.95, 1, 0.95, 0.82, 0.62, 0.35];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const h = Math.imul(i + layer.seed, 2246822519) >>> 0;
        const w = layer.size + (h % layer.size);
        const baseX = (h >>> 3) % spanX;
        const baseY = (h >>> 13) % spanY;
        const mul = 0.8 + ((h >>> 22) % 40) / 100;
        const x = ((((baseX + dirX * layer.speed * mul * ctx.time - view.left * layer.parallax) % spanX) + spanX) % spanX) - marginX;
        const y = ((((baseY + dirY * layer.speed * mul * ctx.time - view.top * layer.parallax) % spanY) + spanY) % spanY) - 40;
        const a = Math.min(0.72, layer.alpha * (0.55 + 0.45 * cloud) + 0.12 * cloud * cloud) * intensity;
        const rowH = Math.max(1, layer.row - 1);
        for (let r = 0; r < rows.length; r++) {
          const rw = Math.round(w * rows[r]);
          const jitter = ((h >>> (r * 3)) % 7) - 3;
          // Nửa dưới đám mây ngả xám để có khối.
          g.rect(Math.round(x - rw / 2 + jitter), Math.round(y + r * rowH), rw, rowH).fill({ color: r >= 5 ? shadeColor : r <= 1 ? rim : color, alpha: a });
        }
      }
    }
  }

  // ---------- Nước chảy từ mái hiên ----------
  private updateRoofWater(state: WeatherVisualState, view: WeatherView, ctx: WeatherFrameContext, intensity: number): void {
    const g = this.roofG;
    g.clear();
    const rain = state.rainIntensity;
    if (rain < 0.06 || (ctx.reducedMotion && rain < 0.3)) return;
    const rw = WEATHER_CONFIG.roofWater;
    // Tỉ lệ khe đang chảy: ít khi mưa nhẹ, gần kín khi mưa to; gió nghiêng dòng nước.
    const fraction = Math.min(0.95, 0.12 + rain * 0.85) * Math.max(0.3, intensity);
    const speed = rw.speedMin + (rw.speedMax - rw.speedMin) * rain;
    const lean = Math.round(Math.cos(state.windDirection) * state.windIntensity * 3);
    const frame = Math.floor(ctx.time * speed);
    let used = 0;
    const maxSlots = rw.maxSlots[ctx.quality];
    for (const eave of ROOF_EAVES) {
      if (!isAwningOpen(eave.awning)) continue; // mặt tiền chưa mở thì không có mái hiên để nước chảy
      if (eave.x1 < view.left - 20 || eave.x0 > view.left + view.width + 20 || eave.y + rw.dropHeight < view.top || eave.y > view.top + view.height) continue;
      // Mép mái ẩm: một vệt sáng mảnh.
      g.rect(eave.x0, eave.y, eave.x1 - eave.x0, 1).fill({ color: rw.color, alpha: 0.25 * Math.min(1, rain * 1.5) });
      const slots = Math.floor((eave.x1 - eave.x0) / rw.spacing);
      for (let i = 0; i < slots && used < maxSlots; i++) {
        const h = Math.imul(i + 1 + Math.round(eave.x0), 2654435761) >>> 0;
        if ((h % 1000) / 1000 > fraction) continue;
        used++;
        const x = Math.round(eave.x0 + i * rw.spacing + 6 + ((h >>> 10) % 5));
        const big = rain > 0.7 && (h >>> 20) % 4 === 0;
        const width = big ? 3 : 2;
        // Các đoạn nước 2–3 px trôi xuống theo bước nguyên (pixel, không mượt).
        const period = rw.dropHeight;
        const phase = (h >>> 5) % period;
        for (let d = 0; d < 2; d++) {
          const off = (frame + phase + d * Math.floor(period / 2)) % period;
          const len = big ? 6 : 5;
          const dx = x + Math.round((lean * off) / period);
          const dy = eave.y + 1 + off;
          const segH = Math.min(len, period - off);
          // Lõi sáng + viền tối 1 px để nhìn rõ trên tường sáng.
          g.rect(dx, dy, width, segH).fill({ color: 0x4d9acb, alpha: 0.9 });
          g.rect(dx, dy, 1, segH).fill({ color: 0xe6f3fa, alpha: 0.95 });
        }
        // Chân dòng nước: bắn tung tóe khi chạm đất (mưa vừa trở lên).
        if (rain > 0.4) {
          const tick = (frame + (h >>> 8)) % 6 < 3;
          const gy = eave.y + 1 + rw.dropHeight;
          const gx = x + lean;
          g.rect(gx - 1, gy, 3, 1).fill({ color: rw.color, alpha: 0.5 });
          if (tick) {
            g.rect(gx - 2, gy - 1, 1, 1).fill({ color: rw.color, alpha: 0.6 });
            g.rect(gx + 2, gy - 1, 1, 1).fill({ color: rw.color, alpha: 0.6 });
          }
        }
      }
    }
  }

  // ---------- Bóng mây ----------
  private updateCloudShadows(state: WeatherVisualState, view: WeatherView, ctx: WeatherFrameContext, intensity: number): void {
    const g = this.cloudG;
    g.clear();
    const c = WEATHER_CONFIG.cloud;
    const strength = state.cloudIntensity * ctx.sun * intensity;
    if (strength < 0.05 || ctx.reducedMotion) return;
    const count = Math.max(1, Math.round(c.maxShadowBlobs[ctx.quality] * Math.min(1, 0.3 + state.cloudIntensity)));
    const speed = c.driftBase + c.driftWind * state.windIntensity;
    const dirX = Math.cos(state.windDirection);
    const dirY = Math.sin(state.windDirection) * 0.35;
    const spanX = ctx.mapWidthPx + 600;
    const spanY = ctx.mapHeightPx + 300;
    for (let i = 0; i < count; i++) {
      const h = Math.imul(i + 1, 2654435761) >>> 0;
      const w = 150 + (h % 120);
      const hh = Math.round(w * (0.38 + ((h >>> 8) % 20) / 100));
      const baseX = (h >>> 4) % spanX;
      const baseY = (h >>> 12) % spanY;
      const mul = 0.7 + ((h >>> 20) % 60) / 100;
      const x = Math.round((((baseX + dirX * speed * mul * ctx.time) % spanX) + spanX) % spanX - 300);
      const y = Math.round((((baseY + dirY * speed * mul * ctx.time) % spanY) + spanY) % spanY - 150);
      // Bỏ blob ngoài tầm nhìn để đỡ vẽ.
      if (x + w < view.left - 20 || x - w > view.left + view.width + 20 || y + hh < view.top - 20 || y - hh > view.top + view.height + 20) continue;
      const a = c.shadowAlpha * strength * (0.45 + 0.55 * state.sunOcclusion);
      // Ba vòng elip lồng nhau tạo mép mềm theo bậc (giữ chất pixel).
      g.ellipse(x, y, w, hh).fill({ color: c.color, alpha: a * 0.4 });
      g.ellipse(x + 8, y - 2, w * 0.76, hh * 0.76).fill({ color: c.color, alpha: a * 0.35 });
      g.ellipse(x - 6, y + 2, w * 0.5, hh * 0.52).fill({ color: c.color, alpha: a * 0.3 });
    }
  }

  // ---------- Mưa ----------
  private updateRain(state: WeatherVisualState, view: WeatherView, ctx: WeatherFrameContext, intensity: number, dt: number): void {
    const r = WEATHER_CONFIG.rain;
    const rain = state.rainIntensity;
    const areaScale = Math.max(0.6, Math.min(1.6, (view.width * view.height) / (480 * 270)));
    const density = rain < 0.02 ? 0 : 0.12 + 0.88 * Math.pow(rain, 0.9);
    const maxPool = r.maxDrops[ctx.quality];
    const target = Math.min(maxPool, Math.round(maxPool * density * this.perfFactor * intensity * areaScale));

    while (this.drops.length < target) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.anchor.set(0.5, 1);
      sprite.eventMode = 'none';
      const near = Math.random() < r.nearFraction;
      const d: Drop = { x: 0, y: 0, groundY: 0, near, sprite };
      this.respawn(d, view, 0, 1, true);
      this.drops.push(d);
      this.dropLayer.addChild(sprite);
    }

    const { vx, vy } = rainVelocity(rain, state.windIntensity, state.windDirection);
    const theta = Math.atan2(vy, vx);
    const length = r.lengthMin + (r.lengthMax - r.lengthMin) * rain;
    const alpha = Math.min(0.85, 0.3 + 0.32 * rain) * (0.7 + 0.3 * intensity);
    const splashChance = r.splashChance[ctx.quality] * rain;
    const splashCap = r.maxSplashes[ctx.quality];

    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      const on = i < target;
      d.sprite.visible = on;
      if (!on) continue;
      const mul = d.near ? 1.35 : 1;
      d.x += vx * mul * dt;
      d.y += vy * mul * dt;
      // Mưa không xuyên mái: giọt xa biến mất khi rơi vào trong nhà hoặc dưới mái hiên; giọt gần camera chỉ bị che trong nhà.
      const zone = shelterZoneAt(view.left + d.x, view.top + d.y);
      const covered = zone !== null && (zone.kind === 'building' || !d.near);
      d.sprite.visible = !covered;
      if (d.y >= d.groundY) {
        if (!covered && !ctx.reducedMotion && this.splashes.length < splashCap && Math.random() < splashChance * (d.near ? 1.4 : 1)) {
          this.splashes.push({ x: view.left + d.x, y: view.top + d.groundY, age: 0, wind: state.windIntensity * Math.cos(state.windDirection) });
        }
        this.respawn(d, view, vx, vy, false);
      }
      const s = d.sprite;
      s.position.set(Math.round(d.x), Math.round(d.y));
      s.rotation = theta - Math.PI / 2;
      s.width = d.near ? 2 : 1;
      s.height = d.near ? length * 1.6 : length;
      s.tint = d.near ? r.colorNear : r.color;
      s.alpha = d.near ? Math.min(0.9, alpha + 0.12) : alpha;
    }
    // Hết mưa thì thu bớt pool để không giữ sprite thừa.
    if (target === 0 && this.drops.length > 0) {
      for (const d of this.drops) d.sprite.destroy();
      this.drops = [];
    }
  }

  private respawn(d: Drop, view: WeatherView, vx: number, vy: number, initial: boolean): void {
    const slant = vy > 1 ? (vx / vy) * view.height : 0;
    const minX = slant > 0 ? -slant - 10 : -10;
    const maxX = slant > 0 ? view.width + 10 : view.width - slant + 10;
    d.x = minX + Math.random() * (maxX - minX);
    d.groundY = d.near ? view.height * (0.75 + 0.25 * Math.random()) : view.height * (0.3 + 0.7 * Math.random());
    d.y = initial ? Math.random() * d.groundY : -12 - Math.random() * 24;
  }

  // ---------- Lá / giấy bay ----------
  private updateDebris(state: WeatherVisualState, view: WeatherView, ctx: WeatherFrameContext, intensity: number, dt: number): void {
    const w = WEATHER_CONFIG.wind;
    const wind = state.windIntensity;
    const max = w.maxDebris[ctx.quality];
    const target = ctx.reducedMotion || wind < w.debrisThreshold ? 0 : Math.round(max * smooth(w.debrisThreshold, 0.85, wind) * intensity * this.perfFactor);
    while (this.debris.length < target) {
      const paper = Math.random() < 0.3;
      this.debris.push({
        x: Math.random() * view.width, y: Math.random() * view.height, phase: Math.random() * 6.28,
        kind: paper ? 'paper' : 'leaf', color: paper ? PAPER_COLOR : LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      });
    }
    if (this.debris.length > target) this.debris.length = target;
    const dirX = Math.cos(state.windDirection);
    const dirY = Math.sin(state.windDirection);
    for (const d of this.debris) {
      const response = w.response[d.kind];
      const speed = (30 + 190 * wind) * response;
      const flutter = Math.sin(ctx.time * (4 + wind * 4) + d.phase);
      d.x += dirX * speed * dt;
      d.y += (dirY * speed * 0.5 + flutter * 14 * (0.4 + wind) + 8) * dt;
      if (d.x > view.width + 8 || d.x < -8 || d.y > view.height + 8 || d.y < -8) {
        // Quay lại phía đầu gió để luồng bay liên tục cùng hướng.
        d.x = dirX >= 0 ? -6 : view.width + 6;
        d.y = Math.random() * view.height;
      }
    }
  }

  // ---------- Vũng nước ----------
  private updatePuddles(state: WeatherVisualState, ctx: WeatherFrameContext, intensity: number, dt: number): void {
    const g = this.puddleG;
    g.clear();
    const level = state.puddleLevel;
    if (level < 0.32) { this.ripples.length = 0; return; }
    const geo = puddleGeometry(level);
    const cfg = WEATHER_CONFIG.puddle;
    const py = KERB_Y + 14;

    // Gợn khi mưa chạm vũng (lấy mẫu, có trần số lượng).
    this.rippleBudget += cfg.rippleChance[ctx.quality] * 14 * state.rainIntensity * level * intensity * dt * this.perfFactor;
    while (this.rippleBudget >= 1) {
      this.rippleBudget -= 1;
      if (this.ripples.length >= cfg.maxRipples[ctx.quality]) break;
      const drain = STORM_DRAINS[Math.floor(Math.random() * STORM_DRAINS.length)];
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random());
      this.ripples.push({ x: drain.tileX * TILE_SIZE + 16 + Math.cos(a) * geo.rx * rr * 0.8, y: py + Math.sin(a) * geo.ry * rr * 0.7, age: 0, max: 3 + Math.random() * 3 });
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.age += dt;
      if (rp.age >= 0.7) { this.ripples.splice(i, 1); continue; }
      const t = rp.age / 0.7;
      g.ellipse(Math.round(rp.x), Math.round(rp.y), 1 + rp.max * t, (1 + rp.max * t) * 0.45).stroke({ color: 0xe2f0f7, alpha: 0.6 * (1 - t), width: 1 });
    }

    // Phản chiếu: đèn đường/cửa tiệm ban đêm và chớp trên mặt nước.
    const lamp = ctx.night * level;
    const flash = state.lightningIntensity * level;
    for (const drain of STORM_DRAINS) {
      const px = drain.tileX * TILE_SIZE + 16;
      if (lamp > 0.05) {
        g.rect(px - 1, py - 2, 3, Math.round(4 + geo.ry * 0.6)).fill({ color: 0xffd27a, alpha: 0.4 * lamp });
        g.rect(px - 4, py, 9, 1).fill({ color: 0xffe6a8, alpha: 0.25 * lamp });
      }
      if (flash > 0.05) g.ellipse(px, py, geo.rx * 0.8, geo.ry * 0.7).fill({ color: 0xdfe8ff, alpha: 0.5 * flash });
    }
    // Ánh đèn cửa tiệm hắt xuống đường ướt (cửa ở khoảng x = 304).
    if (ctx.night > 0.1 && level > 0.35) {
      g.rect(300, KERB_Y + 10, 8, 22).fill({ color: 0xffd27a, alpha: 0.16 * ctx.night * level });
      g.rect(302, KERB_Y + 12, 4, 14).fill({ color: 0xffe6a8, alpha: 0.12 * ctx.night * level });
    }
  }

  /** Bắn nước khi nhân vật đi qua vũng (lấy mẫu theo thời gian). */
  stepActors(state: WeatherVisualState, ctx: WeatherFrameContext): void {
    this.actorCooldown -= ctx.dt;
    if (this.actorCooldown > 0 || state.puddleLevel < 0.35 || ctx.reducedMotion) return;
    const geo = puddleGeometry(state.puddleLevel);
    const py = KERB_Y + 14;
    for (const a of ctx.actors) {
      for (const drain of STORM_DRAINS) {
        const px = drain.tileX * TILE_SIZE + 16;
        if (Math.abs(a.x - px) < geo.rx + 4 && Math.abs(a.y - py) < geo.ry + 6 && this.splashes.length < WEATHER_CONFIG.rain.maxSplashes[ctx.quality]) {
          this.splashes.push({ x: a.x, y: a.y, age: 0, wind: 0 });
          this.actorCooldown = 0.14;
          return;
        }
      }
    }
  }

  // ---------- Vẽ giọt bắn và lá ----------
  private drawFx(state: WeatherVisualState, view: WeatherView): void {
    const g = this.fxG;
    g.clear();
    const life = 0.28;
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.age += 1 / 60;
      if (s.age >= life) { this.splashes.splice(i, 1); continue; }
      const t = s.age / life;
      const x = Math.round(s.x - view.left);
      const y = Math.round(s.y - view.top);
      const lean = Math.round(s.wind * 2);
      const a = 0.75 * (1 - t);
      if (t < 0.4) g.rect(x - 1 + lean, y, 3, 1).fill({ color: 0xdcecf5, alpha: a });
      else {
        g.rect(x - 2 + lean, y - 1, 1, 1).fill({ color: 0xdcecf5, alpha: a });
        g.rect(x + 2 + lean, y - 1, 1, 1).fill({ color: 0xdcecf5, alpha: a });
        g.rect(x + lean, y - 2, 1, 1).fill({ color: 0xdcecf5, alpha: a });
      }
    }
    for (const d of this.debris) {
      const flip = Math.sin(d.phase + d.x * 0.08) > 0;
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      if (d.kind === 'paper') g.rect(x, y, flip ? 3 : 2, flip ? 2 : 3).fill({ color: d.color, alpha: 0.85 });
      else g.rect(x, y, flip ? 2 : 1, flip ? 1 : 2).fill({ color: d.color, alpha: 0.9 });
    }
  }

  destroy(): void {
    for (const layer of [this.groundLayer, this.roofLayer, this.darknessLayer, this.topLayer]) layer.destroy({ children: true });
    this.drops = [];
  }
}

/** Độ lệch skew (rad nhỏ) cho cây/biển hiệu từ gió; building luôn 0. Dùng chung công thức windSway của game-core. */
export function swaySkew(kind: 'tree' | 'sign', wind: number, direction: number, time: number, phase: number): number {
  const max = kind === 'tree' ? 0.05 : 0.09;
  return windSway(kind, wind, time, phase) * Math.cos(direction) * max + Math.cos(direction) * wind * (kind === 'tree' ? 0.008 : 0.02);
}
