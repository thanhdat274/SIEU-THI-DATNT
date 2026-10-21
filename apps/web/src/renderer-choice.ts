/** Chọn renderer (thuần, không kéo Pixi/Babylon vào để test được). Mặc định 3D; 2D cổ điển là Pixi. */
export type RendererKind = 'pixi' | '3d';

export const RENDERER_STORAGE_KEY = 'renderer';

/** `3d` → 3D; `2d`/`pixi` → 2D cổ điển; giá trị khác → null (không có ý kiến). */
export function parseRendererPref(value: string | null | undefined): RendererKind | null {
  if (value === '3d') return '3d';
  if (value === '2d' || value === 'pixi') return 'pixi';
  return null;
}

/** Ưu tiên: `?r=` trên URL > mặc định 3D. KHÔNG đọc localStorage 'renderer' (bỏ qua nếu truyền vào). */
export function resolveRendererPreference(search: string, _stored?: string | null): RendererKind {
  const fromUrl = parseRendererPref(new URLSearchParams(search).get('r'));
  return fromUrl ?? '3d';
}

/** Xóa khóa 'renderer' khỏi localStorage khi khởi động để người từng chọn 2D không bị kẹt ở 2D. */
export function clearStoredRenderer(storage: Pick<Storage, 'removeItem'> | null): void {
  try { storage?.removeItem(RENDERER_STORAGE_KEY); } catch { /* bỏ qua lỗi storage */ }
}

/** Không có WebGL thì 3D không chạy được: quay về 2D. */
export function chooseRenderer(preferred: RendererKind, webglAvailable: boolean): RendererKind {
  return preferred === '3d' && !webglAvailable ? 'pixi' : preferred;
}

/** Máy có tạo được ngữ cảnh WebGL không (dùng canvas tạm, không đụng canvas của game). */
export function detectWebGL(createCanvas: () => { getContext(id: string): unknown }): boolean {
  try {
    const canvas = createCanvas();
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Lựa chọn người chơi lưu ở localStorage: đọc lỗi (chế độ riêng tư...) thì coi như chưa lưu. */
export function readStoredRenderer(storage: Pick<Storage, 'getItem'> | null): string | null {
  try { return storage?.getItem(RENDERER_STORAGE_KEY) ?? null; } catch { return null; }
}

export function saveRendererPreference(storage: Pick<Storage, 'setItem'> | null, kind: RendererKind): void {
  try { storage?.setItem(RENDERER_STORAGE_KEY, kind === '3d' ? '3d' : '2d'); } catch { /* không lưu được thì lần sau dùng mặc định */ }
}

interface Initializable { initialize(): Promise<void>; destroy(): void }

/**
 * Tạo và khởi tạo renderer; khởi tạo 3D lỗi thì ghi cảnh báo, hủy bản 3D rồi dựng 2D thay thế.
 * `onCreated` báo mỗi renderer vừa tạo (để nơi gọi giữ tham chiếu mà hủy khi bị hủy giữa chừng).
 */
export async function initializeWithFallback<T extends Initializable>(
  kind: RendererKind,
  create: (kind: RendererKind) => Promise<T>,
  onCreated?: (viewport: T, kind: RendererKind) => void,
  warn: (message: string, error: unknown) => void = (m, e) => console.warn(m, e),
): Promise<{ viewport: T; kind: RendererKind }> {
  let viewport = await create(kind);
  onCreated?.(viewport, kind);
  try {
    await viewport.initialize();
    return { viewport, kind };
  } catch (error) {
    if (kind !== '3d') throw error;
    warn('Renderer 3D khởi tạo lỗi, quay về 2D cổ điển.', error);
    try { viewport.destroy(); } catch { /* bản 3D hỏng một nửa: bỏ qua lỗi dọn dẹp */ }
    viewport = await create('pixi');
    onCreated?.(viewport, 'pixi');
    await viewport.initialize();
    return { viewport, kind: 'pixi' };
  }
}
