import type { GameTileMap, Vector2D } from '@game/shared';
import type { GameSimulation } from '@game/core';
import type { PlanningOverlay } from './planning-overlay';

/** Tùy chọn chung cho mọi renderer. */
export interface GameViewportOptions {
  canvas: HTMLCanvasElement;
  tileMap: GameTileMap;
  simulation: GameSimulation;
  onResize?: (width: number, height: number) => void;
  onZoomChange?: (zoom: number) => void;
  /** Chạm (không kéo) vào lô đất đợt đã mở mà chưa mua (land-reclamation 4.3). */
  onParcelTap?: (parcelId: string) => void;
  /** Chọn tòa nhà khi click chuột (giai đoạn F sẽ nối UI). */
  onBuildingSelect?: (buildingId: string | null) => void;
  getPartnerAvatar?: () => { position: Vector2D; direction: string; isMoving?: boolean; name?: string } | null;
  /** Renderer 3D báo hướng bản đồ ứng với phải/xuống màn hình mỗi khi camera xoay (2D không gọi). */
  onViewBasisChange?: (right: { x: number; y: number }, down: { x: number; y: number }) => void;
}

export type MinimapSnapshot = {
  view: { x0: number; y0: number; x1: number; y1: number };
  player: { x: number; y: number };
  map: { x0: number; y0: number; x1: number; y1: number };
  openedWaves: readonly string[];
  owned: readonly string[];
  built: Readonly<Record<string, string>>;
};

/** Mặt giao tiếp app web dùng với renderer 3D (Babylon, docs/plans/3d-migration-plan.md). */
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
  /** Bỏ chọn tòa và tắt viền. */
  clearBuildingSelection(): void;
}
