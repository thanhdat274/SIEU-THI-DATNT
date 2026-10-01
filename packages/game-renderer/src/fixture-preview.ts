import { Texture } from 'pixi.js';
import { PixelTextureFactory } from './textures';
import { FURNITURE_SPRITES, PALETTE } from './ref-pixelart';

const TYPE_KEYS: Record<string, string> = {
  shelf_wooden: 'fixture_shelf_wooden:mi_hao_hao:full',
  shelf_glass: 'fixture_shelf_wooden:xa_xi_chuong_duong:full',
  refrigerator: 'fixture_refrigerator',
  cashier_counter: 'fixture_cashier',
};
const cache = new Map<string, string>();
let factory: PixelTextureFactory | null = null;

/** Có sprite riêng cho mã món trong danh mục nội thất không. */
export const hasFurnitureSprite = (shopId: string): boolean => !!FURNITURE_SPRITES[shopId];

function spriteCanvas(rows: readonly string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (color === undefined) continue;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

/** Món danh mục đã có bản vẽ theo lượng hàng trong game (kệ gỗ/tủ mát): giữ bản vẽ đó, không thay bằng sprite tĩnh. */
export const STOCK_ART_SHOP_IDS = new Set(['shelf', 'fridge', 'fridge_single', 'counter']);

const textureCache = new Map<string, Texture>();
/** Texture Pixi từ sprite danh mục (nearest), null nếu không có sprite. */
export function furnitureSpriteTexture(shopId: string): Texture | null {
  const rows = FURNITURE_SPRITES[shopId];
  if (!rows) return null;
  let texture = textureCache.get(shopId);
  if (!texture) {
    texture = Texture.from(spriteCanvas(rows));
    texture.source.scaleMode = 'nearest';
    textureCache.set(shopId, texture);
  }
  return texture;
}

/** Ảnh pixel-art (data URL) của nội thất: ưu tiên sprite theo mã danh mục, không có thì lấy từ bộ vẽ trong game theo loại. */
export function fixturePreviewUrl(type: string, shopId?: string): string {
  const id = shopId && FURNITURE_SPRITES[shopId] ? `shop:${shopId}` : TYPE_KEYS[type] ?? 'fixture_shelf_wooden';
  const hit = cache.get(id);
  if (hit) return hit;
  let url: string;
  if (id.startsWith('shop:')) url = spriteCanvas(FURNITURE_SPRITES[shopId!]).toDataURL('image/png');
  else { factory ??= new PixelTextureFactory(); url = factory.getCanvas(id).toDataURL('image/png'); }
  cache.set(id, url);
  return url;
}
