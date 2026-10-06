import { Texture } from 'pixi.js';
import { FIXTURE_SHOP } from '@game/data';
import { isPropFixture, PROP_FIXTURE_IDS } from './prop-fixtures';
import { PixelTextureFactory } from './textures';
import { FURNITURE_SPRITES, PALETTE } from './ref-pixelart';

/** Ảnh xem trước của kệ có sẵn vài món hàng cho dễ nhìn; tủ mát và quầy để nguyên. */
const TYPE_KEYS: Record<string, string> = {
  fixture_shelf_wooden: 'fixture_shelf_wooden:mi_hao_hao:full',
  fixture_shelf_wooden_single: 'fixture_shelf_wooden_single:mi_hao_hao:full',
  fixture_shelf_glass: 'fixture_shelf_glass:xa_xi_chuong_duong:full',
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

/** Món danh mục dùng bản vẽ chuẩn theo loại (kệ/tủ/quầy, có lượng hàng) thay vì sprite tĩnh, để mọi kệ và quầy cùng một phong cách. */
export const STOCK_ART_SHOP_IDS = new Set(['shelf', 'shelf_double', 'shelf_3', 'shelf_4', 'fridge', 'fridge_single', 'freezer', 'bread_case', 'glass_case', 'counter', 'counter2', ...PROP_FIXTURE_IDS]);

/** Khóa texture chuẩn của kệ/tủ/quầy theo loại và bề rộng (ô); 1 ô dùng bản 32px để không tràn sang ô bên cạnh. */
export function fixtureTextureKey(type: string, widthTiles: number, shopId?: string): string {
  const wide = widthTiles >= 2;
  if (isPropFixture(shopId)) return `fixture_prop_${shopId}`;
  if (type === 'cashier_counter') return wide ? 'fixture_cashier' : 'fixture_cashier_single';
  if (type === 'refrigerator') return shopId === 'freezer' && wide ? 'fixture_freezer' : wide ? 'fixture_refrigerator' : 'fixture_refrigerator_single';
  if (type === 'shelf_glass') return 'fixture_shelf_glass';
  return wide ? 'fixture_shelf_wooden' : 'fixture_shelf_wooden_single';
}

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
  const staticSprite = !!shopId && !STOCK_ART_SHOP_IDS.has(shopId) && !!FURNITURE_SPRITES[shopId];
  const width = (shopId && FIXTURE_SHOP.find((item) => item.id === shopId)?.widthTiles) || 2;
  const standard = fixtureTextureKey(type, width, shopId);
  const id = staticSprite ? `shop:${shopId}` : TYPE_KEYS[standard] ?? standard;
  const hit = cache.get(id);
  if (hit) return hit;
  let url: string;
  if (id.startsWith('shop:')) url = spriteCanvas(FURNITURE_SPRITES[shopId!]).toDataURL('image/png');
  else { factory ??= new PixelTextureFactory(); url = factory.getCanvas(id).toDataURL('image/png'); }
  cache.set(id, url);
  return url;
}
