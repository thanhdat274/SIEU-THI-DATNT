/**
 * Phần THUẦN (không đụng Pixi/DOM) của hạ tầng nạp spritesheet: đọc JSON atlas → danh sách khung theo khóa texture.
 * Hỗ trợ 2 dạng JSON:
 *  - gọn:  { "image": "player.png", "resolution": 2, "frames": { "player_down_idle_0": { "x":0,"y":0,"w":64,"h":72 } } }
 *  - TexturePacker/Pixi (hash): { "meta": { "image": "player.png" }, "frames": { "key": { "frame": { "x","y","w","h" } } } }
 * `resolution` (mặc định 1): ảnh vẽ gấp N lần kích thước logic. Texture hiển thị đúng kích thước logic = pixel / N,
 * nên thay hình 32×36 bằng bản 64×72 không làm lệch bố cục, chỉ thêm chi tiết.
 */
export interface AtlasFrameRect { x: number; y: number; w: number; h: number }

export interface ParsedAtlas {
  image: string;
  resolution: number;
  frames: Map<string, AtlasFrameRect>;
}

export interface AtlasIndex { atlases: string[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function rectFrom(value: unknown): AtlasFrameRect | null {
  if (!isRecord(value)) return null;
  const nested = isRecord(value.frame) ? value.frame : value;
  const { x, y } = nested;
  const w = nested.w ?? nested.width;
  const h = nested.h ?? nested.height;
  if (!isNum(x) || !isNum(y) || !isNum(w) || !isNum(h)) return null;
  if (x < 0 || y < 0 || w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

/** Trả null nếu JSON không đúng dạng (thiếu image/frames). Khung hỏng bị bỏ qua, không làm hỏng cả atlas. */
export function parseAtlas(json: unknown): ParsedAtlas | null {
  if (!isRecord(json) || !isRecord(json.frames)) return null;
  const meta = isRecord(json.meta) ? json.meta : {};
  const image = typeof json.image === 'string' ? json.image : typeof meta.image === 'string' ? meta.image : null;
  if (!image) return null;
  const rawResolution = json.resolution ?? meta.resolution ?? meta.scale;
  const resolution = isNum(rawResolution) && rawResolution >= 1 ? rawResolution : 1;
  const frames = new Map<string, AtlasFrameRect>();
  for (const [key, value] of Object.entries(json.frames)) {
    const rect = rectFrom(value);
    if (rect) frames.set(key, rect);
  }
  return { image, resolution, frames };
}

export function parseAtlasIndex(json: unknown): AtlasIndex | null {
  if (!isRecord(json) || !Array.isArray(json.atlases)) return null;
  return { atlases: json.atlases.filter((item): item is string => typeof item === 'string' && item.length > 0) };
}

/** Ghép đường dẫn tương đối của atlas/ảnh với thư mục chứa nó (chặn `..` thoát khỏi thư mục asset). */
export function resolveAssetPath(baseDir: string, relative: string): string | null {
  if (/^[a-z]+:|^\/\//i.test(relative) || relative.split('/').includes('..')) return null;
  const dir = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
  return `${dir}${relative.replace(/^\.\//, '')}`;
}

/** Khung (đơn vị logic) của một khóa sau khi chia cho resolution. */
export function logicalFrame(rect: AtlasFrameRect, resolution: number): AtlasFrameRect {
  return { x: rect.x / resolution, y: rect.y / resolution, w: rect.w / resolution, h: rect.h / resolution };
}
