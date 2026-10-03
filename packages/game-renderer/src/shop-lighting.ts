import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { LightingState, lerpColor } from '@game/core';
import { GameTileMap, StoreFixture, TILE_SIZE, getFixtureDimensions, isWarehouseFixture } from '@game/shared';
import { BUILDING_MAP, DRINK_BOUNDS, STORE_BOUNDS, STREET_LAMP_TILES, WAREHOUSE_BOUNDS, XOI_BOUNDS } from '@game/data';

type LightKind = 'artificial' | 'sun' | 'street';

/**
 * Cường độ đèn ngoài đường (đèn đường, đèn pha xe): bật theo độ sáng bầu trời chứ không theo `artificial`, vì `artificial`
 * còn dùng cho đèn trong tiệm và giảm rất chậm suốt buổi sáng (còn ~0,4 lúc 7 giờ khi trời đã sáng). Tắt hẳn khi nắng
 * ≥ 0,46 (~7 giờ sáng, ~17 giờ 30 chiều), sáng đủ khi nắng ≤ 0,2 (bình minh ~6 giờ, hoàng hôn ~18 giờ 30).
 */
export function streetLightStrength(state: LightingState): number {
  return Math.max(0, Math.min(1, (0.46 - state.sun) / 0.26));
}
interface LightSprite { sprite: Sprite; base: number; kind: LightKind; flicker: number }
interface Shadow { graphics: Graphics; width: number; strength: number }

/** Phương tiện đang chạy cần bật đèn ban đêm (vị trí là điểm neo giữa-đáy của sprite). */
export interface VehicleLightSource {
  x: number;
  y: number;
  direction: 'left' | 'right';
  type: 'car' | 'motorbike' | 'bicycle' | 'minibus' | 'truck';
  /** Độ mờ của sprite (xe mờ dần ở mép bản đồ thì đèn cũng mờ theo). */
  alpha: number;
}

/**
 * Vị trí đèn theo từng loại xe (px so với điểm neo giữa-đáy, khớp sprite trong premium-textures.ts):
 * front/rear = khoảng cách ngang từ tâm tới đèn trước/sau, headY/tailY = độ cao đèn, beam = độ dài vệt sáng trước đầu xe.
 */
const VEHICLE_LIGHTS: Record<VehicleLightSource['type'], { front: number; rear: number; headY: number; tailY: number; beam: number; spread: number; power: number }> = {
  car: { front: 61, rear: 61, headY: 23, tailY: 23, beam: 78, spread: 34, power: 1 },
  motorbike: { front: 27, rear: 29, headY: 29, tailY: 21, beam: 56, spread: 26, power: 0.85 },
  bicycle: { front: 22, rear: 20, headY: 24, tailY: 12, beam: 26, spread: 14, power: 0.35 },
  minibus: { front: 94, rear: 94, headY: 27, tailY: 26, beam: 100, spread: 44, power: 1.1 },
  truck: { front: 54, rear: 56, headY: 30, tailY: 20, beam: 90, spread: 38, power: 1.1 },
};

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
  private readonly warehouseTint = new Graphics();
  private staticLights: LightSprite[] = [];
  private stallLights: LightSprite[] = [];
  private warehouseLights: LightSprite[] = [];
  private fixtureLights: LightSprite[] = [];
  private warehouseFixtureLights: LightSprite[] = [];
  private shadows: Shadow[] = [];
  private glints: Graphics[] = [];
  private lampBulbs: Array<{ g: Graphics; warehouse: boolean; stall?: boolean }> = [];
  private actorShadows: Graphics[] = [];
  private vehicleLights: Array<{ head: Sprite; beam: Sprite; tail: Sprite }> = [];
  private sunPatch?: Sprite;
  private fixtureSignature = '';
  private mapKey = '';
  private warehouseLightProgress = 0;

  constructor(tintLayer: Container, private readonly lightLayer: Container, private readonly shadowLayer: Container) {
    for (const tint of [this.outdoorTint, this.indoorTint, this.warehouseTint]) {
      tint.blendMode = 'multiply';
      tint.eventMode = 'none';
      tintLayer.addChild(tint);
    }
  }

  private xoiOpen = false;
  private drinkOpen = false;
  private xoiTop = XOI_BOUNDS.top;
  private drinkTop = DRINK_BOUNDS.top;

  /** Dựng lại lớp tint và các đèn cố định khi bản đồ đổi (ví dụ mua đất hoặc mở quầy vỉa hè). */
  public rebuildMap(tileMap: GameTileMap): void {
    const originY = tileMap.originTileY ?? 0;
    const ground = tileMap.layers.find((l) => l.name === 'ground')?.data;
    const stallsKey = (tileMap.stalls ?? []).map((s) => `${s.id}:${s.tileX}`).join(',');
    // Tiệm xôi mở/đóng không đổi nền (vỏ nhà luôn có sàn) nên phải đưa trạng thái mở vào khóa dựng lại.
    this.xoiOpen = tileMap.buildings?.find((building) => building.id === 'xoi')?.open ?? false;
    this.drinkOpen = tileMap.buildings?.find((building) => building.id === 'drink')?.open ?? false;
    this.xoiTop = tileMap.buildings?.find((building) => building.id === 'xoi')?.top ?? XOI_BOUNDS.top;
    this.drinkTop = tileMap.buildings?.find((building) => building.id === 'drink')?.top ?? DRINK_BOUNDS.top;
    const key = `${tileMap.width}x${tileMap.height}:${ground ? ground.join('') : ''}:${stallsKey}:xoi${this.xoiOpen ? 1 : 0}@${this.xoiTop}:drink${this.drinkOpen ? 1 : 0}@${this.drinkTop}`;
    if (key === this.mapKey) return;
    this.mapKey = key;
    const pad = 18 * T;
    this.outdoorTint.clear();
    this.indoorTint.clear();
    this.warehouseTint.clear();
    this.outdoorTint.rect(-pad, originY * T - pad, tileMap.width * T + pad * 2, tileMap.height * T + pad * 2).fill(0xffffff);

    // Khu vực nhà kho phủ riêng bằng warehouseTint (để bật/tắt độc lập với tiệm)
    const whX = WAREHOUSE_BOUNDS.left * T;
    const whY = WAREHOUSE_BOUNDS.top * T;
    const whW = (WAREHOUSE_BOUNDS.right - WAREHOUSE_BOUNDS.left + 1) * T;
    const whH = (WAREHOUSE_BOUNDS.bottom - WAREHOUSE_BOUNDS.top) * T;
    this.warehouseTint.rect(whX, whY, whW, whH).fill(0xffffff);

    if (ground) {
      const ALL_INDOOR = new Set([3, 9]); // 3: sàn tiệm, 9: sàn kho
      for (let y = 0; y < tileMap.height; y++) {
        const worldY = y + originY;
        let x = 0;
        while (x < tileMap.width) {
          if (!ALL_INDOOR.has(ground[y * tileMap.width + x])) { x++; continue; }
          const start = x;
          while (x < tileMap.width && ALL_INDOOR.has(ground[y * tileMap.width + x])) x++;
          this.outdoorTint.rect(start * T, worldY * T, (x - start) * T, T).cut();
        }
        x = 0;
        while (x < tileMap.width) {
          if (ground[y * tileMap.width + x] !== 3) { x++; continue; }
          const start = x;
          while (x < tileMap.width && ground[y * tileMap.width + x] === 3) x++;
          this.indoorTint.rect(start * T, worldY * T, (x - start) * T, T).fill(0xffffff);
        }
      }
    }
    this.rebuildStaticLights();
    this.syncStalls(tileMap.stalls ?? []);
  }

  /** Đồng bộ quầng sáng đèn treo cho các quầy ăn uống trên vỉa hè. */
  public syncStalls(stalls: Array<{ id: string; tileX: number; tileY: number; widthTiles: number }>): void {
    for (const l of this.stallLights) l.sprite.destroy();
    this.stallLights = [];
    this.lampBulbs = this.lampBulbs.filter((l) => { if (l.stall) l.g.destroy(); return !l.stall; });
    for (const stall of stalls) {
      // Hai bóng đèn treo dưới mái hiên sọc (mái ở ~đỉnh sprite 64x48 đặt tại (tileY+1)*T-48).
      for (const dx of [0.5, 1.5].map((k) => k * T * (stall.widthTiles / 2))) {
        this.addLamp(stall.tileX * T + dx, (stall.tileY + 1) * T - 48 + 24, false, true);
      }
      // Đèn vàng ấm treo dưới mái hiên sọc của quầy tỏa ánh sáng xuống bàn pha/lò nướng
      this.add(
        this.stallLights,
        (stall.tileX + 1) * T,
        (stall.tileY + 1) * T - 26,
        2.5 * T,
        2.1 * T,
        0xffca70,
        1,
        'artificial',
        0.04
      );
    }
  }

  /** Dựng lại đèn nội thất và bóng đổ khi bố cục đổi; chữ ký giúp bỏ qua khi không đổi. */
  public syncFixtures(fixtures: StoreFixture[]): void {
    const signature = fixtures.map((f) => `${f.id}:${f.type}:${f.tileX}:${f.tileY}`).join('|');
    if (signature === this.fixtureSignature) return;
    this.fixtureSignature = signature;
    for (const l of this.fixtureLights) l.sprite.destroy();
    for (const l of this.warehouseFixtureLights) l.sprite.destroy();
    for (const s of this.shadows) s.graphics.destroy();
    this.fixtureLights = [];
    this.warehouseFixtureLights = [];
    this.shadows = [];
    for (const f of fixtures) {
      const dim = getFixtureDimensions(f);
      const x = f.tileX * T, y = f.tileY * T, w = dim.widthTiles * T, h = dim.heightTiles * T;
      if (f.type === 'cashier_counter') this.add(this.fixtureLights, x + w / 2, y + h / 2, 1.6 * T, 1.3 * T, 0xffcf9e, 0.28, 'artificial', 0.02);
      else if (f.type === 'refrigerator') {
        const radiusX = f.widthTiles >= 2 ? 1.4 * T : 0.9 * T;
        this.add(this.fixtureLights, x + w / 2, y + h * 0.45, radiusX, 1.1 * T, 0xc2ecf7, 0.18);
      }
      else if (f.type.startsWith('shelf')) this.add(this.fixtureLights, x + w / 2, y + h * 0.8, w * 0.75, 0.55 * T, 0xf2f7ff, 0.22);
      else if (isWarehouseFixture(f)) this.add(this.warehouseFixtureLights, x + w / 2, y + h / 2, 1.6 * T, 1.3 * T, 0xdff0ff, 0.15);
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

  /** Bóng đèn treo: dây + chao + bóng; màu bóng đổi theo trạng thái bật/tắt mỗi khung. */
  private addLamp(x: number, y: number, warehouse: boolean, stall = false): void {
    const g = new Graphics();
    g.eventMode = 'none';
    g.position.set(x, y);
    this.lightLayer.addChild(g);
    this.lampBulbs.push({ g, warehouse, stall });
  }

  private drawLamps(on: { shop: number; warehouse: number }): void {
    for (const { g, warehouse } of this.lampBulbs) {
      const k = warehouse ? on.warehouse : on.shop;
      g.clear();
      g.rect(-0.5, -16, 1, 12).fill(0x2a2118);
      g.poly([-5, -4, 5, -4, 3, -8, -3, -8]).fill(warehouse ? 0x4a5560 : 0x5a3a22);
      g.ellipse(0, -3, 3, 2.2).fill(lerpColor(0x55504a, warehouse ? 0xe4f3ff : 0xfff0c8, k));
    }
  }

  private rebuildStaticLights(): void {
    for (const l of this.staticLights) l.sprite.destroy();
    for (const l of this.warehouseLights) l.sprite.destroy();
    for (const g of this.glints) g.destroy();
    this.staticLights = [];
    this.warehouseLights = [];
    this.glints = [];
    for (const l of this.lampBulbs) l.g.destroy();
    this.lampBulbs = [];
    const out = this.staticLights;
    // Đèn trần cửa hàng (trắng ấm ~3200-3500K), ánh sáng tự nhiên dịu mắt, không bị cháy sáng
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 3; gy++) {
        this.add(out, (STORE_BOUNDS.left + 1.6 + gx * 2.6) * T, (STORE_BOUNDS.top + 1.6 + gy * 2.6) * T, 1.9 * T, 1.7 * T, 0xffeccc, 0.16 + hash(gx, gy) * 0.08);
      }
    }
    // Đèn kho: Đèn tuýp huỳnh quang sáng mát dịu, phòng sáng rõ và sạch sẽ không bị chói lóa
    for (let gx = 0; gx < 2; gx++) {
      for (let gy = 0; gy < 2; gy++) {
        this.add(
          this.warehouseLights,
          (WAREHOUSE_BOUNDS.left + 2.0 + gx * 3.6) * T,
          (WAREHOUSE_BOUNDS.top + 1.8 + gy * 2.5) * T,
          2.4 * T,
          2.0 * T,
          0xdff0ff,
          0.3,
          'artificial',
          0.02
        );
        this.addLamp((WAREHOUSE_BOUNDS.left + 2.0 + gx * 3.6) * T, (WAREHOUSE_BOUNDS.top + 1.8 + gy * 2.5) * T, true);
      }
    }
    for (let gx = 0; gx < 3; gx++) this.addLamp((STORE_BOUNDS.left + 2.6 + gx * 2.6) * T, (STORE_BOUNDS.top + 1.1) * T, false);
    // Biển hiệu: neon ấm cho tiệm, lạnh cho kho; đèn tường hai bên cửa chính.
    this.add(out, (WAREHOUSE_BOUNDS.left + 3.4) * T, WAREHOUSE_BOUNDS.top * T - 12, 2.6 * T, 1.0 * T, 0xffc37a, 0.32, 'artificial', 0.04);
    this.add(out, 10 * T, STORE_BOUNDS.top * T - 4, 1.6 * T, 0.8 * T, 0xbfe6ff, 0.26);
    for (const x of [8.4, 11.6]) this.add(out, x * T, (STORE_BOUNDS.bottom + 0.05) * T, 1.1 * T, 1.1 * T, 0xffd9a0, 0.26);
    // Ánh sáng tiệm lọt ra ngoài: cửa kính rọi xuống vỉa hè, cửa sổ trái rọi ra cỏ.
    this.add(out, 10 * T, (STORE_BOUNDS.bottom + 1.9) * T, 2.8 * T, 1.8 * T, 0xffdfa8, 0.30);
    if (this.xoiOpen) {
      // Tiệm xôi: đèn trần trắng ấm, đèn tường hai bên cửa và ánh sáng lọt ra vỉa hè.
      const xoiRows = Math.max(2, Math.round((XOI_BOUNDS.bottom - this.xoiTop - 2) / 2.6));
      for (let gx = 0; gx < 2; gx++) {
        for (let gy = 0; gy < xoiRows; gy++) {
          this.add(out, (XOI_BOUNDS.left + 1.4 + gx * 2.3) * T, (this.xoiTop + 1.6 + gy * 2.6) * T, 1.8 * T, 1.7 * T, 0xffeccc, 0.18 + hash(gx + 5, gy) * 0.08);
        }
      }
      for (let gx = 0; gx < 2; gx++) this.addLamp((XOI_BOUNDS.left + 1.8 + gx * 2.3) * T, (this.xoiTop + 1.1) * T, false);
      const door = BUILDING_MAP.xoi.doorTiles[0];
      this.add(out, (door.x + 1) * T, XOI_BOUNDS.bottom * T - 8, 3.4 * T, 0.9 * T, 0xffc37a, 0.3, 'artificial', 0.04);
      for (const x of [door.x - 0.6, door.x + 2.6]) this.add(out, x * T, (XOI_BOUNDS.bottom + 0.05) * T, 1.1 * T, 1.1 * T, 0xffd9a0, 0.26);
      this.add(out, (door.x + 1) * T, (XOI_BOUNDS.bottom + 1.9) * T, 2.8 * T, 1.8 * T, 0xffdfa8, 0.30);
    }
    if (this.drinkOpen) {
      // Quán nước: đèn trần trắng hơi lạnh, đèn tường hai bên cửa và ánh sáng lọt ra vỉa hè.
      const drinkRows = Math.max(2, Math.round((DRINK_BOUNDS.bottom - this.drinkTop - 2) / 2.6));
      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < drinkRows; gy++) {
          this.add(out, (DRINK_BOUNDS.left + 1.6 + gx * 2.7) * T, (this.drinkTop + 1.6 + gy * 2.6) * T, 1.8 * T, 1.7 * T, 0xeaf6ff, 0.18 + hash(gx + 9, gy) * 0.08);
        }
      }
      for (let gx = 0; gx < 3; gx++) this.addLamp((DRINK_BOUNDS.left + 2 + gx * 2.7) * T, (this.drinkTop + 1.1) * T, false);
      const door = BUILDING_MAP.drink.doorTiles[0];
      this.add(out, (door.x + 1) * T, DRINK_BOUNDS.bottom * T - 8, 3.4 * T, 0.9 * T, 0xbfe6ff, 0.3, 'artificial', 0.04);
      for (const x of [door.x - 0.6, door.x + 2.6]) this.add(out, x * T, (DRINK_BOUNDS.bottom + 0.05) * T, 1.1 * T, 1.1 * T, 0xd6f0ff, 0.26);
      this.add(out, (door.x + 1) * T, (DRINK_BOUNDS.bottom + 1.9) * T, 2.8 * T, 1.8 * T, 0xd2eeff, 0.30);
    }
    for (const lamp of STREET_LAMP_TILES) this.add(out, lamp.x * T + 16, (lamp.y + 1) * T - 50, 3.1 * T, 3.1 * T, 0xffd98a, 0.75, 'street', 0.03);
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

  public update(state: LightingState, timeSeconds: number, reducedMotion: boolean, inWarehouse: boolean = false, elapsedSeconds: number = 0.016): void {
    this.outdoorTint.tint = state.outdoor;
    this.indoorTint.tint = state.indoor;

    // Cập nhật độ sáng kho theo sự hiện diện: vào kho thì bật sáng, ra kho thì tắt tối
    const targetWarehouse = inWarehouse ? 1 : 0;
    const whSpeed = inWarehouse ? 14 : 7;
    const whStep = reducedMotion ? 1 : Math.min(1, elapsedSeconds * whSpeed);
    this.warehouseLightProgress += (targetWarehouse - this.warehouseLightProgress) * whStep;

    // warehouseTint chuyển mượt từ tối sẫm 0x141824 sang sáng trắng 0xffffff
    this.warehouseTint.tint = lerpColor(0x5a6278, 0xffffff, this.warehouseLightProgress);

    const streetStrength = streetLightStrength(state);
    const apply = (list: LightSprite[]) => {
      for (const l of list) {
        const strength = l.kind === 'sun' ? state.sun : l.kind === 'street' ? streetStrength : state.artificial;
        const wobble = reducedMotion || !l.flicker ? 1 : 1 - l.flicker * (0.5 + 0.5 * Math.sin(timeSeconds * 7 + l.sprite.x));
        l.sprite.alpha = strength * l.base * wobble;
      }
    };
    this.drawLamps({ shop: state.artificial > 0.15 ? 1 : 0, warehouse: this.warehouseLightProgress });
    apply(this.staticLights);
    apply(this.stallLights);
    apply(this.fixtureLights);

    // Đèn trong kho: sáng rực khi vào kho, tắt hoàn toàn khi ra kho
    for (const l of [...this.warehouseLights, ...this.warehouseFixtureLights]) {
      const wobble = reducedMotion || !l.flicker ? 1 : 1 - l.flicker * (0.5 + 0.5 * Math.sin(timeSeconds * 8 + l.sprite.x));
      l.sprite.alpha = this.warehouseLightProgress * l.base * wobble;
    }

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

  /**
   * Đèn pha/đèn hậu của xe đang chạy: quầng sáng ở đầu xe, vệt sáng ấm dọc mặt đường phía trước và đèn đỏ ở đuôi.
   * Cường độ theo đèn nhân tạo của giờ (ban ngày = 0 nên không vẽ gì); xe đỗ coi như tắt máy.
   */
  public updateVehicleLights(sources: VehicleLightSource[], state: LightingState): void {
    const strength = streetLightStrength(state);
    while (this.vehicleLights.length < sources.length) {
      const make = (color: number, rx: number, ry: number): Sprite => {
        const sprite = new Sprite(this.glow);
        sprite.anchor.set(0.5);
        sprite.width = rx * 2;
        sprite.height = ry * 2;
        sprite.tint = color;
        sprite.blendMode = 'add';
        sprite.alpha = 0;
        sprite.eventMode = 'none';
        this.lightLayer.addChild(sprite);
        return sprite;
      };
      this.vehicleLights.push({ head: make(0xfff0b8, 11, 9), beam: make(0xffe3a0, 50, 20), tail: make(0xff3b30, 7, 6) });
    }
    this.vehicleLights.forEach((light, i) => {
      const src = sources[i];
      const visible = !!src && strength > 0.01;
      light.head.visible = light.beam.visible = light.tail.visible = visible;
      if (!visible) return;
      const spec = VEHICLE_LIGHTS[src.type];
      const dir = src.direction === 'right' ? 1 : -1;
      const a = strength * src.alpha * spec.power;
      light.head.position.set(Math.round(src.x + dir * spec.front), Math.round(src.y - spec.headY));
      light.head.alpha = Math.min(1, a * 0.95);
      light.beam.position.set(Math.round(src.x + dir * (spec.front + spec.beam * 0.35)), Math.round(src.y - 4));
      light.beam.width = spec.beam * 1.3;
      light.beam.height = spec.spread;
      light.beam.alpha = Math.min(1, a * 0.55);
      light.tail.position.set(Math.round(src.x - dir * spec.rear), Math.round(src.y - spec.tailY));
      light.tail.alpha = Math.min(1, a * 0.7);
    });
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
    for (const l of this.vehicleLights) { l.head.destroy(); l.beam.destroy(); l.tail.destroy(); }
    this.vehicleLights = [];
    for (const l of [...this.staticLights, ...this.stallLights, ...this.warehouseLights, ...this.fixtureLights, ...this.warehouseFixtureLights]) l.sprite.destroy();
    for (const s of this.shadows) s.graphics.destroy();
    for (const g of this.glints) g.destroy();
    for (const l of this.lampBulbs) l.g.destroy();
    this.lampBulbs = [];
    this.staticLights = [];
    this.stallLights = [];
    this.warehouseLights = [];
    this.fixtureLights = [];
    this.warehouseFixtureLights = [];
    this.shadows = [];
    this.glints = [];
    this.outdoorTint.destroy();
    this.indoorTint.destroy();
    this.warehouseTint.destroy();
  }
}

