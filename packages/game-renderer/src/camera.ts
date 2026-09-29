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

  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    // Calculate appropriate zoom based on screen resolution
    // On small screens, zoom 1.5x or 2x; on desktop 2x or 2.5x
    if (width < 640) {
      this.zoom = 1.75;
    } else if (width < 1024) {
      this.zoom = 2.0;
    } else {
      this.zoom = 2.5;
    }
  }

  public follow(target: Vector2D, dt: number): void {
    // Center of screen in world coordinates
    const halfW = (this.viewportWidth / this.zoom) / 2;
    const halfH = (this.viewportHeight / this.zoom) / 2;

    this.targetX = target.x - halfW;
    this.targetY = target.y - halfH;

    // Clamp camera within map bounds
    const maxCamX = Math.max(0, this.mapWidthPixels - (this.viewportWidth / this.zoom));
    const maxCamY = Math.max(0, this.mapHeightPixels - (this.viewportHeight / this.zoom));

    this.targetX = Math.max(0, Math.min(this.targetX, maxCamX));
    this.targetY = Math.max(0, Math.min(this.targetY, maxCamY));

    // Smooth lerp follow (10.0 lerp factor)
    const lerpSpeed = Math.min(1.0, 10.0 * dt);
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
