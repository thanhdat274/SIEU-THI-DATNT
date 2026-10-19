import { PixiGameViewport, type GameViewport, type GameViewportOptions } from '@game/renderer';

export type RendererKind = 'pixi' | '3d';

/** Đọc renderer muốn dùng: `?r=3d` trên URL, hoặc localStorage `renderer`; mặc định Pixi. */
export function preferredRenderer(): RendererKind {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('r');
    const value = fromUrl ?? window.localStorage.getItem('renderer');
    return value === '3d' ? '3d' : 'pixi';
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
