import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Scene } from '@babylonjs/core/scene';

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Nhiều người dùng chung một SpriteManager: người chơi, bạn co-op, khách, nhân viên, người đi đường. */
export const ACTOR_SPRITE_CAPACITY = 1024;

export interface ActorAtlas {
  manager: SpriteManager;
  frames: ReadonlyMap<string, FrameRect>;
}

/** Chỉ lấy khung nhân vật; atlas sau đè atlas trước (đúng thứ tự index.json như Pixi). */
const ACTOR_KEY = /^(player|partner|npc)_/;
const DEFAULT_ATLASES = ['chars/chars.json', 'residents/residents.json', 'civic/civic.json'];

function spriteBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return `${env?.BASE_URL ?? '/'}assets/sprites/`;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function isRect(v: unknown): v is FrameRect {
  const r = v as FrameRect | null;
  return !!r && typeof r.x === 'number' && typeof r.y === 'number' && typeof r.w === 'number' && typeof r.h === 'number';
}

/**
 * Ghép các atlas nhân vật (chars, residents, civic) thành một ảnh dọc để dùng chung một SpriteManager.
 * Atlas lỗi/thiếu thì bỏ qua: khung thiếu chỉ làm sprite giữ khung cũ, không chặn game.
 */
export async function createActorAtlas(scene: Scene): Promise<ActorAtlas> {
  const base = spriteBase();
  const index = await fetchJson(`${base}index.json`) as { atlases?: unknown } | null;
  const paths = Array.isArray(index?.atlases) ? index.atlases.filter((p): p is string => typeof p === 'string') : DEFAULT_ATLASES;

  const sheets: Array<{ img: HTMLImageElement; frames: Array<[string, FrameRect]> }> = [];
  for (const path of paths) {
    const json = await fetchJson(`${base}${path}`) as { image?: string; frames?: Record<string, unknown> } | null;
    if (!json?.image || !json.frames || path.split('/').includes('..')) continue;
    const frames = Object.entries(json.frames).filter(([k]) => ACTOR_KEY.test(k)) as Array<[string, unknown]>;
    const rects = frames.map(([k, v]) => [k, (v as { frame?: unknown })?.frame ?? v] as [string, unknown]).filter((e): e is [string, FrameRect] => isRect(e[1]));
    if (rects.length === 0) continue;
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
    const img = await loadImage(`${base}${dir}${json.image}`);
    if (img) sheets.push({ img, frames: rects });
  }

  const width = Math.max(1, ...sheets.map((s) => s.img.width));
  const height = Math.max(1, sheets.reduce((sum, s) => sum + s.img.height, 0));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const frames = new Map<string, FrameRect>();
  let offsetY = 0;
  for (const sheet of sheets) {
    ctx?.drawImage(sheet.img, 0, offsetY);
    for (const [key, r] of sheet.frames) frames.set(key, { x: r.x, y: r.y + offsetY, w: r.w, h: r.h });
    offsetY += sheet.img.height;
  }

  const packed: Record<string, { frame: FrameRect }> = {};
  for (const [key, frame] of frames) packed[key] = { frame };
  const manager = new SpriteManager(
    'actors',
    canvas.toDataURL('image/png'),
    ACTOR_SPRITE_CAPACITY,
    { width: 32, height: 51 },
    scene,
    0.01,
    Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    true,
    JSON.stringify({ frames: packed }),
  );
  manager.texture.updateSamplingMode(Constants.TEXTURE_NEAREST_SAMPLINGMODE);
  return { manager, frames };
}

/**
 * Tạo sprite nhân vật dùng chung cho mọi nơi. Hệ tay phải (scene.useRightHandedSystem) làm SpriteManager vẽ
 * sprite lật ngang so với PNG nên phải đặt invertU; sửa một chỗ này thì người chơi, bạn co-op, khách và NPC cùng đúng
 * và vẫn đúng khi xoay camera (hướng 'left' của facingFromMovement không đổi).
 */
export function createActorSprite(name: string, manager: SpriteManager): Sprite {
  const sprite = new Sprite(name, manager);
  sprite.invertU = manager.texture.getScene()?.useRightHandedSystem === true;
  return sprite;
}
