import { PixiGameViewport, type GameViewport, type GameViewportOptions } from '@game/renderer';
import { chooseRenderer, detectWebGL, readStoredRenderer, resolveRendererPreference, type RendererKind } from './renderer-choice';

export type { RendererKind };

/** Renderer sẽ dùng: `?r=2d|3d` trên URL, hoặc localStorage `renderer`; mặc định 3D, không có WebGL thì 2D. */
export function preferredRenderer(): RendererKind {
  try {
    const preferred = resolveRendererPreference(window.location.search, readStoredRenderer(window.localStorage));
    const webgl = detectWebGL(() => document.createElement('canvas'));
    if (preferred === '3d' && !webgl) console.warn('Trình duyệt không có WebGL, dùng đồ họa 2D cổ điển.');
    return chooseRenderer(preferred, webgl);
  } catch {
    return 'pixi';
  }
}

/** Tạo renderer theo loại. Babylon chỉ tải (chunk riêng) khi chọn 3D. */
export async function createViewport(kind: RendererKind, options: GameViewportOptions): Promise<GameViewport> {
  if (kind === '3d') {
    const { BabylonGameViewport } = await import('@game/renderer-3d');
    return new BabylonGameViewport(options);
  }
  return new PixiGameViewport(options);
}
