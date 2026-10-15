/**
 * Input handling cho PixiGameViewport — pointer, touch, wheel, resize.
 * Tách ra khỏi viewport.ts để giảm file size và dễ test đơn vị.
 */
import { RECLAMATION_WAVES, type LandParcel } from '@game/data';
import { TILE_SIZE } from '@game/shared';

export interface ViewportInputHandlers {
  onZoomChange?: (zoom: number) => void;
  onParcelTap?: (parcelId: string) => void;
  /** Cho phép input module sửa trực tiếp camera state. */
  isPointerDown?: boolean;
  activePointerId?: number | null;
  isPointerDragging?: boolean;
  pointerStartX?: number;
  pointerStartY?: number;
  initialPinchDistance?: number | null;
  initialPinchZoom?: number;
  canvas?: HTMLCanvasElement | null;
}

/** Xử lý con trỏ (click, kéo, touchpad) — pan bản đồ. */
export function handlePointerDown(
  vp: ViewportInputHandlers & {
    isPointerDown: boolean; activePointerId: number | null; isPointerDragging: boolean;
    pointerStartX: number; pointerStartY: number;
    camera: { isDragging: boolean; pan(dx: number, dy: number): void };
    canvas: HTMLCanvasElement | null;
  },
  e: PointerEvent,
): void {
  if (e.button !== 0 && e.button !== 1) return;
  if (vp.isPointerDown && e.pointerId !== vp.activePointerId) return;
  vp.activePointerId = e.pointerId;
  vp.isPointerDown = true;
  vp.isPointerDragging = false;
  vp.pointerStartX = e.clientX;
  vp.pointerStartY = e.clientY;
}

export function handlePointerMove(
  vp: ViewportInputHandlers & {
    isPointerDown: boolean; activePointerId: number | null; isPointerDragging: boolean;
    pointerStartX: number; pointerStartY: number;
    camera: { isDragging: boolean; pan(dx: number, dy: number): void };
    canvas: HTMLCanvasElement | null;
  },
  e: PointerEvent,
): void {
  if (!vp.isPointerDown || e.pointerId !== vp.activePointerId) return;

  const dx = e.clientX - vp.pointerStartX;
  const dy = e.clientY - vp.pointerStartY;

  if (!vp.isPointerDragging && Math.hypot(dx, dy) > 4) {
    vp.isPointerDragging = true;
    vp.camera.isDragging = true;
    if (vp.canvas) {
      vp.canvas.style.cursor = 'grabbing';
    }
  }

  if (vp.isPointerDragging) {
    vp.camera.pan(dx, dy);
    vp.pointerStartX = e.clientX;
    vp.pointerStartY = e.clientY;
  }
}

/** Tìm lô chưa mua của đợt đã mở tại tọa độ màn hình. */
export function findUnownedParcelAt(
  canvas: HTMLCanvasElement,
  camera: { x: number; y: number; zoom: number },
  simulation: { getWorldOpenState(): { openedWaves: string[] }; getOwnedParcelIds(): string[] },
  canvasPoint: (cx: number, cy: number) => { x: number; y: number },
  clientX: number,
  clientY: number,
): string | null {
  const p = canvasPoint(clientX, clientY);
  const tx = Math.floor((camera.x + p.x / camera.zoom) / TILE_SIZE);
  const ty = Math.floor((camera.y + p.y / camera.zoom) / TILE_SIZE);
  const opened = simulation.getWorldOpenState().openedWaves;
  const owned = simulation.getOwnedParcelIds();
  for (const wave of RECLAMATION_WAVES) {
    if (!opened.includes(wave.id)) continue;
    for (const raw of wave.parcels) {
      if (owned.includes(raw.id)) continue;
      const r = raw.rect;
      if (tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1) return raw.id;
    }
  }
  return null;
}

export function handlePointerUp(
  vp: ViewportInputHandlers & {
    isPointerDown: boolean; activePointerId: number | null; isPointerDragging: boolean;
    camera: { isDragging: boolean };
    canvas: HTMLCanvasElement | null;
    onParcelTap?: (parcelId: string) => void;
  },
  e: PointerEvent,
  canvasPoint: (cx: number, cy: number) => { x: number; y: number },
  simulation: { getWorldOpenState(): { openedWaves: string[] }; getOwnedParcelIds(): string[] },
): void {
  if (vp.isPointerDown && e.pointerId !== vp.activePointerId) return;
  if (vp.isPointerDown && !vp.isPointerDragging && e.type === 'pointerup' && e.target === vp.canvas && vp.onParcelTap) {
    const parcelId = findUnownedParcelAt(vp.canvas!, vp.camera as any, simulation, canvasPoint, e.clientX, e.clientY);
    if (parcelId) vp.onParcelTap(parcelId);
  }
  vp.activePointerId = null;
  vp.isPointerDown = false;
  vp.isPointerDragging = false;
  vp.camera.isDragging = false;
  if (vp.canvas) {
    vp.canvas.style.cursor = 'default';
  }
}

/** Quy đổi tọa độ client sang tọa độ canvas. */
export function canvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

/** Xử lý wheel chuột — zoom vào điểm trỏ. */
export function handleWheel(
  vp: ViewportInputHandlers & {
    canvas: HTMLCanvasElement | null;
    camera: { zoomBy(factor: number, center?: { x: number; y: number }): void; targetZoom: number };
    onZoomChange?: (zoom: number) => void;
    WHEEL_ZOOM_RATE?: number;
    PINCH_WHEEL_ZOOM_RATE?: number;
  },
  e: WheelEvent,
  canvasPoint: (cx: number, cy: number) => { x: number; y: number },
): void {
  e.preventDefault();
  if (e.deltaY === 0) return;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
  const delta = Math.max(-150, Math.min(150, e.deltaY * unit));
  const rate = e.ctrlKey ? (vp.PINCH_WHEEL_ZOOM_RATE ?? 0.01) : (vp.WHEEL_ZOOM_RATE ?? Math.log(1.12) / 100);
  vp.camera.zoomBy(Math.exp(-delta * rate), canvasPoint(e.clientX, e.clientY));
  vp.onZoomChange?.(vp.camera.targetZoom);
}

export function handleTouchStart(
  vp: ViewportInputHandlers & {
    initialPinchDistance: number | null;
    initialPinchZoom: number;
    camera: { targetZoom: number };
    canvas: HTMLCanvasElement | null;
  },
  e: TouchEvent,
  canvasPoint: (cx: number, cy: number) => { x: number; y: number },
): void {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    vp.initialPinchDistance = Math.hypot(dx, dy);
    vp.initialPinchZoom = vp.camera.targetZoom;
  }
}

export function handleTouchMove(
  vp: ViewportInputHandlers & {
    initialPinchDistance: number | null;
    initialPinchZoom: number;
    camera: { zoomTo(zoom: number, center?: { x: number; y: number }): void; targetZoom: number };
    onZoomChange?: (zoom: number) => void;
    canvas: HTMLCanvasElement | null;
  },
  e: TouchEvent,
  canvasPoint: (cx: number, cy: number) => { x: number; y: number },
): void {
  if (e.touches.length === 2 && vp.initialPinchDistance) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const currentDistance = Math.hypot(dx, dy);
    const scaleFactor = currentDistance / vp.initialPinchDistance;
    const mid = canvasPoint(
      (e.touches[0].clientX + e.touches[1].clientX) / 2,
      (e.touches[0].clientY + e.touches[1].clientY) / 2,
    );
    vp.camera.zoomTo(vp.initialPinchZoom * scaleFactor, mid);
    vp.onZoomChange?.(vp.camera.targetZoom);
  }
}

export function handleTouchEnd(
  vp: ViewportInputHandlers & { initialPinchDistance: number | null },
  e: TouchEvent,
): void {
  if (e.touches.length < 2) {
    vp.initialPinchDistance = null;
  }
}

/** Xử lý resize cửa sổ. */
export function handleResize(
  vp: {
    app: { renderer?: { resolution: number }; screen: { width: number; height: number }; resize(): void };
    canvas: HTMLCanvasElement | null;
    camera: { setViewportSize(w: number, h: number): void; targetZoom: number };
    qualityCap: number;
    onZoomChange?: (zoom: number) => void;
    updateResponsiveSettings(): void;
  },
): void {
  if (!vp.app?.renderer) return;
  vp.updateResponsiveSettings();
  vp.camera.setViewportSize(vp.app.screen.width, vp.app.screen.height);
  vp.onZoomChange?.(vp.camera.targetZoom);
}
