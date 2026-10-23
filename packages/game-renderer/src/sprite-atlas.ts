import { Assets, Rectangle, Texture } from 'pixi.js';
import { logicalFrame, mergeAtlasesInOrder, parseAtlas, parseAtlasIndex, resolveAssetPath, resolveNpcLook } from './sprite-atlas-parse';

/**
 * Hạ tầng nạp spritesheet PNG cho thế giới game. Atlas khai báo khung theo ĐÚNG khóa texture mà `PixelTextureFactory`
 * đang dùng (vd `player_down_idle_0`, `tile_store_floor`) nên thay hình không phải sửa nơi gọi `getTexture`.
 * Khóa nào không có trong atlas (hoặc atlas lỗi/chưa nạp xong) thì factory rơi về hình vẽ bằng code như cũ.
 *
 * Bố cục: `public/assets/sprites/index.json` = { "atlases": ["characters/player.json", ...] }; mỗi atlas là JSON
 * (xem `sprite-atlas-parse.ts`) trỏ tới PNG cùng thư mục. Chưa có index.json = không có asset, game chạy bằng bản vẽ code.
 */
const overrides = new Map<string, Texture>();
let loading: Promise<void> | null = null;

function spriteBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return `${env?.BASE_URL ?? '/'}assets/sprites/`;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function loadAtlas(base: string, atlasPath: string): Promise<Map<string, Texture> | null> {
  const atlasUrl = resolveAssetPath(base, atlasPath);
  if (!atlasUrl) { console.warn(`sprite atlas: đường dẫn không hợp lệ "${atlasPath}"`); return null; }
  const atlas = parseAtlas(await fetchJson(atlasUrl));
  if (!atlas) { console.warn(`sprite atlas: JSON lỗi "${atlasPath}"`); return null; }
  const dir = atlasUrl.slice(0, atlasUrl.lastIndexOf('/') + 1);
  const imageUrl = resolveAssetPath(dir, atlas.image);
  if (!imageUrl) { console.warn(`sprite atlas: ảnh không hợp lệ "${atlas.image}"`); return null; }
  let sheet: Texture;
  try {
    sheet = await Assets.load<Texture>(imageUrl);
  } catch (err) {
    console.warn(`sprite atlas: không nạp được ảnh "${atlas.image}"`, err);
    return null;
  }
  sheet.source.scaleMode = 'nearest';
  sheet.source.resolution = atlas.resolution; // khung tính theo đơn vị logic = pixel / resolution
  const textures = new Map<string, Texture>();
  for (const [key, rect] of atlas.frames) {
    const f = logicalFrame(rect, atlas.resolution);
    if (f.x + f.w > sheet.source.width + 1e-6 || f.y + f.h > sheet.source.height + 1e-6) {
      console.warn(`sprite atlas: khung "${key}" vượt ngoài ảnh "${atlas.image}"`);
      continue;
    }
    textures.set(key, new Texture({ source: sheet.source, frame: new Rectangle(f.x, f.y, f.w, f.h) }));
  }
  return textures;
}

/** Nạp nền, gọi nhiều lần an toàn. Lỗi chỉ cảnh báo, không chặn game. */
export function loadSpriteAtlases(): Promise<void> {
  loading ??= (async () => {
    const base = spriteBase();
    const index = parseAtlasIndex(await fetchJson(`${base}index.json`));
    if (!index || index.atlases.length === 0) return;
    // Gộp theo thứ tự index.json (atlas sau đè atlas trước) để mọi máy thấy cùng khung, không phụ thuộc atlas nào nạp xong trước.
    const merged = await mergeAtlasesInOrder(index.atlases, (path) => loadAtlas(base, path));
    for (const [key, texture] of merged) overrides.set(key, texture);
  })().catch((err) => { loading = null; console.warn('sprite atlases failed to load', err); });
  return loading;
}

/** Texture asset cho khóa này, hoặc null nếu chưa có/không có (khi đó dùng bản vẽ bằng code). */
export function atlasTexture(key: string): Texture | null {
  return overrides.get(key) ?? null;
}

export const spriteAtlasKeyCount = (): number => overrides.size;

/**
 * Độ cao thêm (px) của nhân vật từ atlas so với nhân vật vẽ bằng code (canvas 48 px) — các nhãn/bóng thoại đặt trên đầu
 * cộng thêm giá trị này để không đè lên đầu khi nhân vật cao hơn. 0 nếu chưa có atlas nhân vật.
 */
export function headLift(): number {
  const tex = overrides.get('npc_0_down_idle_0');
  return tex ? Math.max(0, tex.height - 48) : 0;
}

/** Kiểu khách/NPC đi bộ dùng được: atlas có npc_3..9 thì dùng 9 kiểu (bỏ npc_1 = chủ tiệm), không thì 3 kiểu vẽ code. */
const WALKER_LOOKS_8 = [0, 2, 3, 4, 5, 6, 7, 8];
const WALKER_LOOKS_9 = [0, 2, 3, 4, 5, 6, 7, 8, 9];
export function walkerLook(i: number): number {
  const n = Math.abs(Math.floor(i));
  if (overrides.has('npc_9_down_idle_0')) return WALKER_LOOKS_9[n % WALKER_LOOKS_9.length];
  return overrides.has('npc_8_down_idle_0') ? WALKER_LOOKS_8[n % WALKER_LOOKS_8.length] : n % 3;
}

/** Look của cư dân khu phố theo `spriteVariant` (mã look), xem `resolveNpcLook`. */
export function residentLook(spriteVariant: number): number {
  return resolveNpcLook(spriteVariant, (key) => overrides.has(key), walkerLook);
}

/** Cột đèn từ atlas cao hơn bản code (64 px) bao nhiêu px: quầng sáng đèn đường nâng lên đúng chừng đó để nằm ở đầu đèn. */
export function lampLift(): number {
  const tex = overrides.get('deco_lamp_pole');
  return tex ? Math.max(0, tex.height - 64) : 0;
}
