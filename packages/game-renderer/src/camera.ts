import { Vector2D, TILE_SIZE } from '@game/shared';

export class PixelCamera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public zoom: number = 2.0; // 2x default zoom for crisp 32x32 pixel art

  private viewportWidth: number = 960;
  private viewportHeight: number = 540;
  private mapWidthPixels: number = 20 * TILE_SIZE;
  private mapHeightPixels: number = 16 * TILE_SIZE;

  constructor(mapWidthTiles: number, mapHeightTiles: number) {
    this.mapWidthPixels = mapWidthTiles * TILE_SIZE;
    this.mapHeightPixels = mapHeightTiles * TILE_SIZE;
  }

  private isCustomZoom: boolean = false;
  public minZoom: number = 1.0;
  public maxZoom: number = 3;

  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    if (!this.isCustomZoom) {
      // Mobile Portrait (< 768px width) -> Zoom 1.25
      // Mobile Landscape -> Zoom 1.5
      // Desktop Small -> Zoom 2
      // Desktop Large -> Zoom 3
      if (width < 768) {
        this.zoom = height > width ? 1.25 : 1.5;
      } else if (height >= 900 && width >= 1400) {
        this.zoom = 3;
      } else {
        this.zoom = 2;
      }
    }
  }

  public setZoom(newZoom: number): void {
    this.isCustomZoom = true;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(newZoom)));
  }

  public zoomIn(delta: number = 1): number {
    this.setZoom(this.zoom + delta);
    return this.zoom;
  }

  public zoomOut(delta: number = 1): number {
    this.setZoom(this.zoom - delta);
    return this.zoom;
  }

  public panOffsetX: number = 0;
  public panOffsetY: number = 0;
  public isDragging: boolean = false;

  public pan(deltaX: number, deltaY: number): void {
    // deltaX & deltaY are screen pixel deltas, convert to world delta
    this.panOffsetX -= deltaX / this.zoom;
    this.panOffsetY -= deltaY / this.zoom;

    // Limit maximum pan offset so player doesn't lose the shop
    const maxPanDist = 500;
    this.panOffsetX = Math.max(-maxPanDist, Math.min(maxPanDist, this.panOffsetX));
    this.panOffsetY = Math.max(-maxPanDist, Math.min(maxPanDist, this.panOffsetY));
  }

  public resetPan(): void {
    this.panOffsetX = 0;
    this.panOffsetY = 0;
  }

  public follow(target: Vector2D, dt: number, verticalBias?:number): void {
    // Center of screen in world coordinates
    const halfW = (this.viewportWidth / this.zoom) / 2;
    const halfH = (this.viewportHeight / this.zoom) / 2;

    this.targetX = target.x + this.panOffsetX - halfW;
    // Frame the shop sign above the player in desktop default view.
    this.targetY = target.y + this.panOffsetY - halfH - (verticalBias ?? (this.viewportHeight >= 450 ? 70 : 20));

    // Smooth lerp follow (10.0 lerp factor, or snappy when dragging)
    const lerpSpeed = this.isDragging ? 1.0 : Math.min(1.0, 10.0 * dt);
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
  }

  /**
   * Returns integer-rounded world offset to eliminate sub-pixel jitter
   */
  public getRenderOffset(): Vector2D {
    return {
      x: -Math.round(this.x * this.zoom),
      y: -Math.round(this.y * this.zoom),
    };
  }
}
