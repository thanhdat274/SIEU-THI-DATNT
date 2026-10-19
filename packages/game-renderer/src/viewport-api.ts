import type { GameTileMap } from '@game/shared';
import type { PlanningOverlay } from './planning-overlay';
import { PixiGameViewport, type PixiGameViewportOptions } from './viewport';

/** Tùy chọn chung cho mọi renderer (hiện trùng với Pixi). */
export type GameViewportOptions = PixiGameViewportOptions;

export type MinimapSnapshot = {
  view: { x0: number; y0: number; x1: number; y1: number };
  player: { x: number; y: number };
  map: { x0: number; y0: number; x1: number; y1: number };
  openedWaves: readonly string[];
  owned: readonly string[];
  built: Readonly<Record<string, string>>;
};

/** Mặt giao tiếp app web dùng với renderer, để Pixi 2D và 3D (Babylon, docs/plans/3d-migration-plan.md) thay cho nhau được. */
export interface GameViewport {
  initialize(): Promise<void>;
  destroy(): void;
  updateTileMap(tileMap: GameTileMap): void;
  setStallSoldOut(ids: readonly string[]): void;
  setOpenedWaves(openedWaves: readonly string[]): void;
  setPlanningReservations(overlays: readonly PlanningOverlay[]): void;
  showWaveOverlay(show: boolean): boolean;
  addFloatingGain(x: number, y: number, text: string, color?: number): void;
  locateWarehouse(): void;
  zoomIn(delta?: number): number;
  zoomOut(delta?: number): number;
  getZoom(): number;
  getMinimapSnapshot(): MinimapSnapshot;
}

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

/** Tạo renderer theo loại. 3D chưa có (giai đoạn B) nên tạm quay về Pixi. */
export function createViewport(kind: RendererKind, options: GameViewportOptions): GameViewport {
  if (kind === '3d') console.warn('Renderer 3D chưa có, dùng Pixi.');
  return new PixiGameViewport(options);
}
