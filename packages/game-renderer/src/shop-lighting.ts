import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { LightingState } from '@game/core';
import { GameTileMap, StoreFixture, TILE_SIZE, getFixtureDimensions, isWarehouseFixture } from '@game/shared';
import { STORE_BOUNDS, STREET_LAMP_TILES, WAREHOUSE_BOUNDS } from '@game/data';

type LightKind = 'artificial' | 'sun';
interface LightSprite { sprite: Sprite; base: number; kind: LightKind; flicker: number }
interface Shadow { graphics: Graphics; width: number; strength: number }

const INDOOR_GROUND = new Set([3, 9]);
const T = TILE_SIZE;

function glowTexture(): Texture {
  // Một texture gradient dùng chung cho mọi nguồn sáng: mượt, không viền, cùng batch nên rẻ.
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Hệ ánh sáng theo giờ: lớp nhân màu ngoài trời/trong nhà (khoét lỗ theo sàn nhà), các quầng sáng
 * cộng màu cho từng nguồn đèn và bóng đổ nắng. Hình dựng một lần; mỗi khung chỉ đổi tint/alpha.
 */
export class ShopLighting {
  private readonly glow = glowTexture();
  private readonly outdoorTint = new Graphics();
  private readonly indoorTint = new Graphics();
  private staticLights: LightSprite[] = [];
  private fixtureLights: LightSprite[] = [];
  private shadows: Shadow[] = [];
  private glints: Graphics[] = [];
  private actorShadows: Graphics[] = [];
  private sunPatch?: Sprite;
  private fixtureSignature = '';
  private mapKey = '';

  constructor(tintLayer: Container, private readonly lightLayer: Container, private readonly shadowLayer: Container) {
    for (const tint of [this.outdoorTint, this.indoorTint]) {
      tint.blendMode = 'multiply';
      tint.eventMode = 'none';
      tintLayer.addChild(tint);
    }
  }

  /** Dựng lại lớp tint và các đèn cố định khi bản đồ đổi (ví dụ mua đất). */
  public rebuildMap(tileMap: GameTileMap): void {
    const originY = tileMap.originTileY ?? 0;
    const ground = tileMap.layers.find((l) => l.name === 'ground')?.data;
    const key = `${tileMap.width}x${tileMap.height}:${ground ? ground.join('') : ''}`;
    if (key === this.mapKey) return;
    this.mapKey = key;
    const pad = 18 * T;
    this.outdoorTint.clear();
    this.indoorTint.clear();
    this.outdoorTint.rect(-pad, originY * T - pad, tileMap.width * T + pad * 2, tileMap.height * T + pad * 2).fill(0xffffff);
    if (ground) {
      for (let y = 0; y < tileMap.height; y++) {
        let x = 0;
        while (x < tileMap.width) {
          if (!INDOOR_GROUND.has(ground[y * tileMap.width + x])) { x++; continue; }
          const start = x;
          while (x < tileMap.width && INDOOR_GROUND.has(ground[y * tileMap.width + x])) x++;
          this.outdoorTint.rect(start * T, (y + originY) * T, (x - start) * T, T).cut();
          this.indoorTint.rect(start * T, (y + originY) * T, (x - start) * T, T).fill(0xffffff);
        }
      }
    }
    this.rebuildStaticLights();
  }

  /** Dựng lại đèn nội thất và bóng đổ khi bố cục đổi; chữ ký giúp bỏ qua khi không đổi. */
  public syncFixtures(fixtures: StoreFixture[]): void {
    const signature = fixtures.map((f) => `${f.id}:${f.type}:${f.tileX}:${f.tileY}`).join('|');
    if (signature === this.fixtureSignature) return;
    this.fixtureSignature = signature;
    for (const l of this.fixtureLights) l.sprite.destroy();
    for (const s of this.shadows) s.graphics.destroy();
    this.fixtureLights = [];
    this.shadows = [];
    for (const f of fixtures) {
      const dim = getFixtureDimensions(f);
      const x = f.tileX * T, y = f.tileY * T, w = dim.widthTiles * T, h = dim.heightTiles * T;
      const out = this.fixtureLights;
      if (f.type === 'cashier_counter') this.add(out, x + w / 2, y + h / 2, 2 * T, 1.7 * T, 0xffc98a, 0.62, 'artificial', 0.02);
      else if (f.type === 'refrigerator') this.add(out, x + w / 2, y + h / 2, 1.5 * T, 1.7 * T, 0xa8ecff, 0.7);
      else if (f.type.startsWith('shelf')) this.add(out, x + w / 2, y + h * 0.8, w * 0.85, 0.7 * T, 0xf2f7ff, 0.55);
      else if (isWarehouseFixture(f)) this.add(out, x + w / 2, y + h / 2, 1.6 * T, 1.3 * T, 0xdff0ff, 0.25);
      const shadow = new Graphics();
      shadow.eventMode = 'none';
      shadow.position.set(x, y + h);
      this.shadowLayer.addChild(shadow);
      this.shadows.push({ graphics: shadow, width: w, strength: isWarehouseFixture(f) ? 0.5 : 1 });
    }
  }

  private add(target: LightSprite[], x: number, y: number, radiusX: number, radiusY: number, color: number, base: number, kind: LightKind = 'artificial', flicker = 0): Sprite {
    const sprite = new Sprite(this.glow);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.width = radiusX * 2;
    sprite.height = radiusY * 2;
    sprite.tint = color;
    sprite.blendMode = 'add';
    sprite.alpha = 0;
    sprite.eventMode = 'none';
    this.lightLayer.addChild(sprite);
    target.push({ sprite, base, kind, flicker });
    return sprite;
  }

  private rebuildStaticLights(): void {
    for (const l of this.staticLights) l.sprite.destroy();
    for (const g of this.glints) g.destroy();
    this.staticLights = [];
    this.glints = [];
    const out = this.staticLights;
    // Đèn trần cửa hàng (trắng ấm ~3500K), mỗi bóng hơi lệch cường độ để ánh sáng không đều tăm tắp.
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 3; gy++) {
        this.add(out, (STORE_BOUNDS.left + 1.6 + gx * 2.6) * T, (STORE_BOUNDS.top + 1.6 + gy * 2.6) * T, 2.6 * T, 2.2 * T, 0xffeccc, 0.34 + hash(gx, gy) * 0.16);
      }
    }
    // Đèn kho: huỳnh quang lạnh (~5500K), yếu hơn.
    for (let gx = 0; gx < 2; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        this.add(out, (WAREHOUSE_BOUNDS.left + 1.8 + gx * 3.2) * T, (WAREHOUSE_BOUNDS.top + 1.8 + gy * 2.6) * T, 2.6 * T, 2.2 * T, 0xdff0ff, 0.3 + hash(gx + 7, gy) * 0.1);
      }
    }
    // Biển hiệu: neon ấm cho tiệm, lạnh cho kho; đèn tường hai bên cửa chính.
    this.add(out, (WAREHOUSE_BOUNDS.left + 3.4) * T, WAREHOUSE_BOUNDS.top * T - 12, 2.8 * T, 1.1 * T, 0xffc37a, 0.6, 'artificial', 0.05);
    this.add(out, 10 * T, STORE_BOUNDS.top * T - 4, 1.8 * T, 0.9 * T, 0xbfe6ff, 0.45);
    for (const x of [8.4, 11.6]) this.add(out, x * T, (STORE_BOUNDS.bottom + 0.05) * T, 1.3 * T, 1.3 * T, 0xffd9a0, 0.6);
    // Ánh sáng tiệm lọt ra ngoài: cửa kính rọi xuống vỉa hè, cửa sổ trái rọi ra cỏ.
    this.add(out, 10 * T, (STORE_BOUNDS.bottom + 1.9) * T, 3.4 * T, 2.2 * T, 0xffdfa8, 0.55);
    this.add(out, (STORE_BOUNDS.left - 1.4) * T, 5.5 * T, 2.6 * T, 1.6 * T, 0xffd9a0, 0.5);
    for (const lamp of STREET_LAMP_TILES) this.add(out, lamp.x * T + 16, (lamp.y + 1) * T - 50, 3.1 * T, 3.1 * T, 0xffd98a, 0.75, 'artificial', 0.03);
    // Nắng lọt qua cửa vào và cửa sổ (chỉ ban ngày); vệt nắng dịch theo giờ.
    this.sunPatch = this.add(out, 10 * T, (STORE_BOUNDS.bottom - 1.4) * T, 1.9 * T, 1.5 * T, 0xffe9b0, 0.5, 'sun');
    this.add(out, (STORE_BOUNDS.left + 1.6) * T, 5.7 * T, 1.6 * T, 0.9 * T, 0xfff0c0, 0.35, 'sun');
    // Vệt phản chiếu trên kính cửa: dải chéo sáng, chỉ ban ngày.
    for (let i = 0; i < 2; i++) {
      const glint = new Graphics();
      glint.poly([0, 0, 7, 0, -3, 22, -10, 22]).fill({ color: 0xffffff, alpha: 1 });
      glint.position.set(9 * T + 16 + i * 26, STORE_BOUNDS.bottom * T + 4);
      glint.blendMode = 'add';
      glint.alpha = 0;
      glint.eventMode = 'none';
      this.lightLayer.addChild(glint);
      this.glints.push(glint);
    }
  }

  public update(state: LightingState, timeSeconds: number, reducedMotion: boolean): void {
    this.outdoorTint.tint = state.outdoor;
    this.indoorTint.tint = state.indoor;
    const apply = (list: LightSprite[]) => {
      for (const l of list) {
        const strength = l.kind === 'sun' ? state.sun : state.artificial;
        const wobble = reducedMotion || !l.flicker ? 1 : 1 - l.flicker * (0.5 + 0.5 * Math.sin(timeSeconds * 7 + l.sprite.x));
        l.sprite.alpha = strength * l.base * wobble;
      }
    };
    apply(this.staticLights);
    apply(this.fixtureLights);
    if (this.sunPatch) this.sunPatch.x = (10 - state.shadowLean * 0.8) * T;
    const drift = reducedMotion ? 0 : Math.sin(timeSeconds * 0.4) * 2;
    this.glints.forEach((g, i) => { g.alpha = state.sun * (i === 0 ? 0.32 : 0.19); g.x = 9 * T + 16 + i * 26 + drift; });
    // Bóng đổ nắng: dài và ngả theo giờ, nhạt đi khi nắng yếu.
    const dx = state.shadowLean * (6 + state.shadowLength * 9);
    const drop = 3 + state.shadowLength * 5;
    for (const s of this.shadows) {
      const g = s.graphics;
      g.clear();
      const alpha = state.sun * 0.26 * s.strength;
      if (alpha < 0.01) continue;
      g.poly([0, -3, s.width, -3, s.width + dx, drop, dx, drop]).fill({ color: 0x1c1410, alpha });
    }
  }

  /** Bóng dưới chân người/NPC: bóng tiếp xúc luôn có, thêm vệt nắng ngả theo giờ khi trời sáng. */
  public updateActorShadows(feet: Array<{ x: number; y: number }>, state: LightingState): void {
    while (this.actorShadows.length < feet.length) {
      const g = new Graphics();
      g.eventMode = 'none';
      this.shadowLayer.addChild(g);
      this.actorShadows.push(g);
    }
    const sunAlpha = state.sun * 0.28;
    const stretch = 1 + Math.abs(state.shadowLean) * state.shadowLength * 0.9;
    const dx = state.shadowLean * state.shadowLength * 4;
    this.actorShadows.forEach((g, i) => {
      const f = feet[i];
      g.visible = !!f;
      if (!f) return;
      g.clear();
      g.position.set(Math.round(f.x), Math.round(f.y));
      g.ellipse(0, -1, 8, 3).fill({ color: 0x1c1410, alpha: 0.14 + state.artificial * 0.04 });
      if (sunAlpha > 0.01) g.ellipse(dx, -1, 8 * stretch, 3.4).fill({ color: 0x1c1410, alpha: sunAlpha });
    });
  }

  public destroy(): void {
    for (const g of this.actorShadows) g.destroy();
    this.actorShadows = [];
    for (const l of [...this.staticLights, ...this.fixtureLights]) l.sprite.destroy();
    for (const s of this.shadows) s.graphics.destroy();
    for (const g of this.glints) g.destroy();
    this.staticLights = [];
    this.fixtureLights = [];
    this.shadows = [];
    this.glints = [];
  }
}
