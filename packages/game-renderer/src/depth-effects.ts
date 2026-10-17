import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { LightingState } from '@game/core';
import { TILE_SIZE } from '@game/shared';

/** Một khối nhà nhìn từ trên xuống (ô), cửa và mái hiên (px) để tính bóng/tối chân tường/quầng cửa. */
export interface DepthBuilding {
  bounds: { left: number; right: number; top: number; bottom: number };
  awning?: { x0: number; x1: number };
  doorTiles?: Array<{ x: number; y: number }>;
  /** Tòa đã có quầng cửa riêng trong `ShopLighting` (tiệm chính): không thêm quầng nữa. */
  hasOwnSpill?: boolean;
}

/** Chiều cao tường quy ước (px) để tính độ dài bóng; nhà 2.5D chỉ vẽ mặt tiền nên dùng một số chung. */
export const BUILDING_SHADOW_HEIGHT = 1.6 * TILE_SIZE;
export const BUILDING_SHADOW_MAX = 3.5 * TILE_SIZE;
const SHADOW_COLOR = 0x26190e;

/**
 * Đa giác bóng đổ của một hình chữ nhật dịch theo (dx, dy), BỎ phần nằm dưới chính hình chữ nhật
 * (bóng nằm trên lớp nền nên không được tối sàn trong nhà). Trả về mảng phẳng [x0,y0,x1,y1,...] hoặc [] nếu không có bóng.
 */
export function buildingShadowPolygon(r: { x0: number; y0: number; x1: number; y1: number }, dx: number, dy: number): number[] {
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return [];
  const sx = dx >= 0 ? 1 : -1;
  const sy = dy >= 0 ? 1 : -1;
  // Góc "đuôi" theo hướng bóng và hai góc kề nó.
  const cx = sx > 0 ? r.x1 : r.x0;
  const cy = sy > 0 ? r.y1 : r.y0;
  const n1 = { x: sx > 0 ? r.x1 : r.x0, y: sy > 0 ? r.y0 : r.y1 };
  const n2 = { x: sx > 0 ? r.x0 : r.x1, y: sy > 0 ? r.y1 : r.y0 };
  return [n1.x, n1.y, n1.x + dx, n1.y + dy, cx + dx, cy + dy, n2.x + dx, n2.y + dy, n2.x, n2.y, cx, cy];
}

/** Độ dài/độ đậm bóng tòa nhà theo ánh nắng (cùng công thức bóng cây). */
export function buildingShadowShape(light: Pick<LightingState, 'sun' | 'sunElevation' | 'shadowDir'>, rain = 0): { dx: number; dy: number; alpha: number } {
  const alpha = Math.max(0, 0.22 * light.sun * (1 - rain * 0.88));
  if (light.sunElevation <= 0.02 || alpha <= 0.004) return { dx: 0, dy: 0, alpha: 0 };
  const length = Math.min(BUILDING_SHADOW_MAX, BUILDING_SHADOW_HEIGHT / Math.tan(light.sunElevation));
  return { dx: light.shadowDir.x * length, dy: light.shadowDir.y * length, alpha };
}

/**
 * Hiệu ứng chiều sâu rẻ, chỉ hình ảnh (không đổi sprite, save, gameplay):
 * - bóng đổ tòa nhà theo giờ (vẽ lại chỉ khi hình dạng bóng đổi),
 * - tối chân tường mặt tiền + dưới mái hiên (tĩnh, dựng một lần),
 * - quầng sáng cửa ban đêm cho tòa chưa có quầng riêng.
 * Tắt trong cài đặt chất lượng → ẩn cả ba lớp, không tốn khung.
 */
export class DepthEffects {
  private readonly shadow = new Graphics();
  private readonly contact = new Graphics();
  private spills: Sprite[] = [];
  private rects: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  private shadowKey = '';
  private enabled = true;

  constructor(private readonly shadowLayer: Container, private readonly lightLayer: Container, private readonly glow: Texture) {
    this.shadow.eventMode = 'none';
    this.contact.eventMode = 'none';
    shadowLayer.addChild(this.shadow);
    shadowLayer.addChild(this.contact);
  }

  public rebuild(buildings: DepthBuilding[]): void {
    const T = TILE_SIZE;
    this.rects = buildings.map(b => ({ x0: b.bounds.left * T, y0: b.bounds.top * T, x1: (b.bounds.right + 1) * T, y1: (b.bounds.bottom + 1) * T }));
    this.shadowKey = '';
    this.shadow.clear();
    this.contact.clear();
    for (const s of this.spills) s.destroy();
    this.spills = [];
    for (const b of buildings) {
      const x0 = b.bounds.left * T;
      const x1 = (b.bounds.right + 1) * T;
      const y = (b.bounds.bottom + 1) * T;
      // Tối chân tường: 3 dải mỏng giảm dần trên vỉa hè sát mặt tiền.
      this.contact.rect(x0, y, x1 - x0, 2).fill({ color: SHADOW_COLOR, alpha: 0.26 });
      this.contact.rect(x0, y + 2, x1 - x0, 2).fill({ color: SHADOW_COLOR, alpha: 0.14 });
      this.contact.rect(x0, y + 4, x1 - x0, 3).fill({ color: SHADOW_COLOR, alpha: 0.06 });
      // Dưới mái hiên: thêm một dải tối rộng hơn đúng bề ngang mái.
      if (b.awning) this.contact.rect(b.awning.x0, y, b.awning.x1 - b.awning.x0, 9).fill({ color: SHADOW_COLOR, alpha: 0.1 });
      // Chân tường hai bên hông (bóng tiếp xúc hẹp).
      this.contact.rect(x0 - 3, b.bounds.top * T + 6, 3, y - b.bounds.top * T - 6).fill({ color: SHADOW_COLOR, alpha: 0.1 });
      this.contact.rect(x1, b.bounds.top * T + 6, 3, y - b.bounds.top * T - 6).fill({ color: SHADOW_COLOR, alpha: 0.1 });
      if (!b.hasOwnSpill && b.doorTiles?.length) {
        const dx = (b.doorTiles[0].x + b.doorTiles.length / 2) * T;
        const spill = new Sprite(this.glow);
        spill.anchor.set(0.5);
        spill.position.set(dx, y + 0.9 * T);
        spill.width = (b.doorTiles.length + 2.4) * T;
        spill.height = 2.6 * T;
        spill.tint = 0xffdfa8;
        spill.blendMode = 'add';
        spill.alpha = 0;
        spill.eventMode = 'none';
        spill.visible = this.enabled;
        this.lightLayer.addChild(spill);
        this.spills.push(spill);
      }
    }
  }

  public setEnabled(on: boolean): void {
    this.enabled = on;
    this.shadow.visible = on;
    this.contact.visible = on;
    for (const s of this.spills) s.visible = on;
  }

  public isEnabled(): boolean { return this.enabled; }

  public update(light: LightingState, rain: number, nightStrength: number): void {
    if (!this.enabled) return;
    for (const s of this.spills) s.alpha = nightStrength * 0.32;
    const { dx, dy, alpha } = buildingShadowShape(light, rain);
    const key = `${Math.round(dx)}|${Math.round(dy)}|${Math.round(alpha * 200)}`;
    if (key === this.shadowKey) return;
    this.shadowKey = key;
    this.shadow.clear();
    if (alpha <= 0) return;
    for (const r of this.rects) {
      const poly = buildingShadowPolygon(r, dx, dy);
      if (poly.length) this.shadow.poly(poly).fill({ color: SHADOW_COLOR, alpha });
    }
  }

  public destroy(): void {
    for (const s of this.spills) s.destroy();
    this.spills = [];
    this.shadow.destroy();
    this.contact.destroy();
  }
}
