import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { NeighborhoodLife, type LifeContext, type NeighborNpcView, type NpcFacing, type WeatherVisualState } from '@game/core';
import { NEIGHBORHOOD_QUALITY, PARK, SCHOOL, detailForZoom, type NeighborhoodQuality } from '@game/data';
import type { StreetVehicleState } from '@game/shared';
import type { PixelTextureFactory } from './textures';
import { RainGear, type GearFacing } from './rain-gear';

const T = 32;
const INK = 0x1f1a16;

export interface ActorsFrame {
  dt: number;
  time: number;
  zoom: number;
  view: { x0: number; y0: number; x1: number; y1: number };
  weather: WeatherVisualState | null;
  life: LifeContext;
  vehicles: readonly StreetVehicleState[];
  quality: NeighborhoodQuality;
  /** Cường độ nắng 0..1: chim chỉ bay khi sáng. */
  sun: number;
  gearEnabled: boolean;
  windEffects: boolean;
  reducedMotion: boolean;
  mobile: boolean;
}

interface NpcSprite {
  container: Container;
  body: Sprite;
  shadow: Graphics;
  accessory: Graphics;
  gear: RainGear | null;
  accKey: string;
}

interface BubbleSprite { container: Container; bg: Graphics; text: Text; key: string; width: number; height: number }

/** Vẽ phụ kiện theo loại và hướng nhìn (gốc tọa độ ở chân; thân cao ~48 px). */
function drawAccessory(g: Graphics, kind: string, facing: NpcFacing, tint: number): void {
  g.clear();
  const side = facing === 'left' ? -1 : 1;
  const lateral = facing === 'left' || facing === 'right';
  switch (kind) {
    case 'backpack':
      if (facing === 'down') return; // đeo sau lưng: nhìn từ phía trước không thấy
      if (lateral) g.rect(-side * 9 - 4, -33, 8, 14).fill(INK).rect(-side * 9 - 3, -32, 6, 12).fill(tint === 0xffffff ? 0x2e7dbf : 0xd9533a);
      else g.rect(-8, -34, 16, 16).fill(INK).rect(-7, -33, 14, 14).fill(0x2e7dbf);
      break;
    case 'briefcase':
      g.rect(side * 9 - 4, -13, 9, 7).fill(INK).rect(side * 9 - 3, -12, 7, 5).fill(0x6b4a2f).rect(side * 9 - 1, -15, 3, 2).fill(INK);
      break;
    case 'bag':
      g.rect(side * 9 - 4, -15, 8, 10).fill(INK).rect(side * 9 - 3, -14, 6, 8).fill(0xe03a2e);
      break;
    case 'box':
      if (lateral) g.rect(-side * 10 - 7, -40, 14, 15).fill(INK).rect(-side * 10 - 6, -39, 12, 13).fill(0xe9a33a).rect(-side * 10 - 6, -34, 12, 2).fill(0xb67a20);
      else g.rect(-9, -38, 18, 14).fill(INK).rect(-8, -37, 16, 12).fill(0xe9a33a);
      break;
    case 'cart': {
      // nón lá + xe đẩy bên cạnh
      g.moveTo(-11, -42).lineTo(0, -52).lineTo(11, -42).closePath().fill(0xe4c485).stroke({ color: INK, width: 1 });
      g.rect(side * 16 - 14, -22, 28, 14).fill(INK).rect(side * 16 - 13, -21, 26, 12).fill(0xc0392b).rect(side * 16 - 13, -21, 26, 3).fill(0xe8604f);
      g.rect(side * 16 - 12, -8, 6, 6).fill(INK).rect(side * 16 + 6, -8, 6, 6).fill(INK);
      break;
    }
    case 'cap':
      g.rect(-7, -47, 14, 5).fill(INK).rect(-6, -46, 12, 3).fill(0x8a8a82);
      break;
    case 'band':
      g.rect(-8, -41, 16, 3).fill(0xf1c40f);
      break;
  }
}

/**
 * Dân cư nền của khu phố: sprite NPC dùng chung bộ nhân vật sẵn có (3 mẫu + màu/kích thước/phụ kiện khác nhau), bong bóng
 * thoại pixel, ô/áo mưa (`RainGear`), chim trong công viên. Chỉ dựng sprite cho NPC trong tầm nhìn; ngoài tầm là dữ liệu thuần.
 */
export class NeighborhoodActors {
  readonly life: NeighborhoodLife;
  private sprites = new Map<string, NpcSprite>();
  private spritePool: NpcSprite[] = [];
  private bubbles: BubbleSprite[] = [];
  private activeBubbles = 0;
  private birds: Array<{ sprite: Sprite; cx: number; cy: number; rx: number; ry: number; speed: number; phase: number }> = [];
  private seenThisFrame = new Set<string>();
  /** Số sprite NPC đã dựng/xóa: dùng để kiểm tra không rò rỉ. */
  readonly stats = { created: 0, destroyed: 0 };

  constructor(private readonly textures: PixelTextureFactory, private readonly entities: Container, private readonly overlay: Container, seed: number) {
    this.life = new NeighborhoodLife(seed);
    this.buildBirds();
  }

  public getVisibleSpriteCount(): number { return this.sprites.size; }
  public getBubbleCount(): number { return this.activeBubbles; }

  private buildBirds(): void {
    // Chim vòng quanh công viên và sân trường (vẽ khi trời quang).
    const spots = [
      { cx: ((PARK.area.x0 + PARK.area.x1) / 2) * T, cy: PARK.area.y0 * T + 80 }, { cx: ((PARK.area.x0 + PARK.area.x1) / 2) * T - 120, cy: PARK.area.y1 * T - 140 },
      { cx: 22 * T, cy: SCHOOL.area.y0 * T + 40 }, { cx: 6 * T, cy: -220 }, { cx: 30 * T, cy: 700 }, { cx: 62 * T, cy: -140 },
    ];
    spots.forEach((s, i) => {
      for (let k = 0; k < 2; k++) {
        const sprite = new Sprite(this.textures.getTexture(`nb_bird_${k}`));
        sprite.anchor.set(0.5);
        sprite.visible = false;
        sprite.eventMode = 'none';
        sprite.zIndex = 9000;
        this.overlay.addChild(sprite);
        this.birds.push({ sprite, cx: s.cx + k * 40, cy: s.cy + k * 18, rx: 90 + i * 14, ry: 34 + k * 12, speed: 0.5 + (i % 3) * 0.12, phase: i * 1.3 + k * 2.1 });
      }
    });
  }

  // ------------------------------------------------------------------ sprite NPC

  private acquireSprite(): NpcSprite {
    const reused = this.spritePool.pop();
    if (reused) { reused.container.visible = true; return reused; }
    const container = new Container();
    container.eventMode = 'none';
    const shadow = new Graphics();
    shadow.ellipse(0, 0, 8, 3).fill({ color: 0x26190e, alpha: 0.25 });
    const body = new Sprite(this.textures.getTexture('npc_0_down_idle_0'));
    body.anchor.set(0.5, 1);
    const accessory = new Graphics();
    container.addChild(shadow, body, accessory);
    this.entities.addChild(container);
    this.stats.created++;
    return { container, body, shadow, accessory, gear: null, accKey: '' };
  }

  private releaseSprite(entry: NpcSprite): void {
    entry.container.visible = false;
    this.spritePool.push(entry);
  }

  private placeNpc(entry: NpcSprite, n: NeighborNpcView, f: ActorsFrame, detail: ReturnType<typeof detailForZoom>): void {
    const walking = n.pose === 'walking';
    const sitting = n.pose === 'sitting';
    const dir = n.facing;
    const hz = detail === 'far' ? 4 : 8;
    const frame = f.reducedMotion ? 0 : Math.floor(f.time * (walking ? hz : 1.5)) % (walking ? 4 : 2);
    const key = `npc_${n.spriteVariant}_${sitting ? 'down' : dir}_${walking ? 'walk' : 'idle'}_${frame}`;
    entry.body.texture = this.textures.getTexture(key);
    entry.body.tint = n.tint;
    const bob = walking && !f.reducedMotion ? Math.abs(Math.sin(f.time * (n.type === 'jogger' ? 16 : 9) + n.x * 0.05)) * (n.type === 'jogger' ? 2 : 1.2) : 0;
    entry.container.scale.set(n.scale);
    entry.container.position.set(Math.round(n.x), Math.round(n.y - bob + (sitting ? 5 : 0)));
    entry.container.zIndex = n.y + (sitting ? 6 : 0);
    entry.shadow.visible = !sitting;
    const accKey = `${n.accessory}|${dir}|${n.tint}`;
    if (entry.accKey !== accKey) { entry.accKey = accKey; drawAccessory(entry.accessory, n.accessory, dir, n.tint); }
    entry.accessory.y = sitting ? 0 : 0;
    // Ô/áo mưa: dùng chung RainGear với người chơi/khách (chỉ khi đang mưa và hiệu ứng bật)
    const raining = (f.weather?.rainIntensity ?? 0) > 0.02;
    if (raining && f.gearEnabled && !n.sheltered) {
      if (!entry.gear) { entry.gear = new RainGear(); entry.container.addChild(entry.gear.container); }
      entry.gear.container.visible = true;
      entry.gear.update({
        dt: f.dt, time: f.time, characterId: n.id, day: f.life.day, x: n.x, y: n.y, facing: dir as GearFacing, walking,
        weather: f.weather, enabled: true, reducedMotion: f.reducedMotion, windEffects: f.windEffects,
      });
    } else if (entry.gear) entry.gear.container.visible = false;
  }

  // ------------------------------------------------------------------ bong bóng thoại

  private bubbleFor(index: number): BubbleSprite {
    let b = this.bubbles[index];
    if (b) return b;
    const container = new Container();
    container.eventMode = 'none';
    const bg = new Graphics();
    const text = new Text({ text: '', style: { fontFamily: 'Arial', fontSize: 9, fontWeight: 'bold', fill: 0x2b2118, wordWrap: true, wordWrapWidth: 112, align: 'center', lineHeight: 11 }, resolution: 3 });
    text.anchor.set(0.5, 1);
    container.addChild(bg, text);
    container.visible = false;
    container.zIndex = 10000;
    this.overlay.addChild(container);
    b = { container, bg, text, key: '', width: 0, height: 0 };
    this.bubbles[index] = b;
    return b;
  }

  private drawBubble(b: BubbleSprite, text: string): void {
    if (b.key === text) return;
    b.key = text;
    b.text.text = text;
    const w = Math.ceil(b.text.width) + 12;
    const h = Math.ceil(b.text.height) + 8;
    b.width = w; b.height = h;
    const g = b.bg;
    g.clear();
    const x = -w / 2, y = -h - 6;
    // Viền tối cắt góc kiểu pixel, nền kem hơi trong, đuôi nhọn hướng xuống đầu NPC
    g.rect(x + 2, y, w - 4, h).fill(INK).rect(x, y + 2, w, h - 4).fill(INK);
    g.rect(x + 3, y + 2, w - 6, h - 4).fill({ color: 0xfff7e0, alpha: 0.94 }).rect(x + 2, y + 3, w - 4, h - 6).fill({ color: 0xfff7e0, alpha: 0.94 });
    g.rect(-3, y + h, 6, 2).fill(INK).rect(-2, y + h, 4, 2).fill({ color: 0xfff7e0, alpha: 0.94 }).rect(-1, y + h + 2, 2, 2).fill(INK);
    b.text.position.set(0, -10);
  }

  // ------------------------------------------------------------------ cập nhật

  public update(f: ActorsFrame): void {
    const detail = detailForZoom(f.zoom);
    this.life.update(f.dt, f.life, f.view, detail, f.quality);
    const m = 64;
    this.seenThisFrame.clear();
    let bubbleIndex = 0;
    const maxBubbles = NEIGHBORHOOD_QUALITY[f.quality].bubbles;
    // Bong bóng: càng zoom xa càng phóng to ngược lại để chữ vẫn đọc được (~chiều cao 11 px màn hình), nhưng không quá lớn.
    const bubbleScale = Math.max(0.5, Math.min(2.2, (f.mobile ? 9 : 11) / (9 * f.zoom)));
    this.life.forEachVisible((n) => {
      if (n.x < f.view.x0 - m || n.x > f.view.x1 + m || n.y < f.view.y0 - m - 60 || n.y > f.view.y1 + m) return;
      let entry = this.sprites.get(n.id);
      if (!entry) { entry = this.acquireSprite(); this.sprites.set(n.id, entry); }
      this.seenThisFrame.add(n.id);
      this.placeNpc(entry, n, f, detail);
      if (n.bubble && bubbleIndex < maxBubbles) {
        const b = this.bubbleFor(bubbleIndex++);
        this.drawBubble(b, n.bubble);
        b.container.visible = true;
        b.container.scale.set(bubbleScale);
        b.container.position.set(Math.round(n.x), Math.round(n.y - 50 * n.scale));
        b.container.alpha = Math.min(1, n.bubbleAge < 0.15 ? n.bubbleAge / 0.15 : 1);
      }
    });
    for (let i = bubbleIndex; i < this.bubbles.length; i++) if (this.bubbles[i]) this.bubbles[i].container.visible = false;
    this.activeBubbles = bubbleIndex;
    for (const [id, entry] of this.sprites) {
      if (this.seenThisFrame.has(id)) continue;
      this.sprites.delete(id);
      this.releaseSprite(entry);
    }
    this.updateBirds(f);
  }

  private updateBirds(f: ActorsFrame): void {
    const rain = f.weather?.rainIntensity ?? 0;
    const calm = f.sun > 0.35 && rain < 0.2 && (f.weather?.windIntensity ?? 0) < 0.7;
    const quality = NEIGHBORHOOD_QUALITY[f.quality].birds;
    const n = Math.round(this.birds.length * quality);
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const on = calm && i < n && f.zoom <= 2;
      b.sprite.visible = on;
      if (!on) continue;
      const t = f.time * b.speed + b.phase;
      b.sprite.position.set(Math.round(b.cx + Math.cos(t) * b.rx), Math.round(b.cy + Math.sin(t * 1.3) * b.ry));
      b.sprite.texture = this.textures.getTexture(`nb_bird_${f.reducedMotion ? 0 : Math.floor(f.time * 5 + i) % 2}`);
      b.sprite.scale.x = Math.sin(t) > 0 ? -1 : 1;
      b.sprite.alpha = 1 - rain * 4;
    }
  }

  public destroy(): void {
    for (const entry of [...this.sprites.values(), ...this.spritePool]) { entry.container.destroy({ children: true }); this.stats.destroyed++; }
    this.sprites.clear();
    this.spritePool = [];
    for (const b of this.bubbles) b?.container.destroy({ children: true });
    this.bubbles = [];
    for (const b of this.birds) b.sprite.destroy();
    this.birds = [];
  }
}
