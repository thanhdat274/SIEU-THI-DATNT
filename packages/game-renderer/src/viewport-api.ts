import type { GameTileMap } from '@game/shared';
import type { PlanningOverlay } from './planning-overlay';
import type { PixiGameViewportOptions } from './viewport';

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
  /** Bỏ chọn tòa và tắt viền (renderer 3D); 2D không làm gì. */
  clearBuildingSelection(): void;
}
