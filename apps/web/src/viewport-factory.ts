import { PixiGameViewport, type GameViewport, type GameViewportOptions } from '@game/renderer';
import { chooseRenderer, clearStoredRenderer, detectWebGL, resolveRendererPreference, type RendererKind } from './renderer-choice';

export type { RendererKind };

/** Renderer sẽ dùng: `?r=2d|3d` trên URL; mặc định 3D (bỏ qua localStorage 'renderer' và xóa khóa khi khởi động); không có WebGL thì 2D. */
export function preferredRenderer(onFallback?: (message: string) => void): RendererKind {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      clearStoredRenderer(window.localStorage);
    }
    const preferred = resolveRendererPreference(window.location.search);
    const webgl = detectWebGL(() => document.createElement('canvas'));
    if (preferred === '3d' && !webgl) {
      console.warn('Trình duyệt không có WebGL, dùng đồ họa 2D cổ điển.');
      onFallback?.('Máy không hỗ trợ 3D, đang dùng đồ họa 2D');
    }
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
