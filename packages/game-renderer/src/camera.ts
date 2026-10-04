import { Vector2D, TILE_SIZE } from '@game/shared';
import { ZOOM_LEVELS, ZOOM_MAX, ZOOM_MIN, snapZoom } from '@game/data';

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
  /** Zoom xa nhất 0,5× (thấy cả khu phố): mỗi điểm ảnh sprite = nửa điểm ảnh màn hình, vẫn nearest-neighbor, không méo. */
  public minZoom: number = ZOOM_MIN;
  public maxZoom: number = ZOOM_MAX;

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

  /** Chỉ nhận các mức zoom giữ pixel nguyên (0,5/1/2/3): giá trị khác được kéo về mức gần nhất theo tỉ lệ. */
  public setZoom(newZoom: number): void {
    this.isCustomZoom = true;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, snapZoom(newZoom)));
    this.clampPan();
  }

  /** Bước lên mức zoom kế tiếp (gần hơn); `steps` mức mỗi lần. */
  public zoomIn(steps: number = 1): number {
    return this.stepZoom(Math.max(1, Math.round(steps)));
  }

  /** Bước xuống mức zoom kế tiếp (xa hơn). */
  public zoomOut(steps: number = 1): number {
    return this.stepZoom(-Math.max(1, Math.round(steps)));
  }

  private stepZoom(steps: number): number {
    // Tìm vị trí hiện tại trong danh sách mức (zoom mặc định 1,25/1,5 trên điện thoại nằm giữa hai mức).
    let next = this.zoom;
    for (let i = 0; i < Math.abs(steps); i++) {
      const levels = ZOOM_LEVELS;
      if (steps > 0) next = levels.find((l) => l > next + 1e-6) ?? levels[levels.length - 1];
      else next = [...levels].reverse().find((l) => l < next - 1e-6) ?? levels[0];
    }
    this.setZoom(next);
    return this.zoom;
  }

  /** Khoảng kéo tối đa (px thế giới): càng xa càng được kéo rộng để đi tới trường/chung cư/đồi mà không mất tiệm. */
  public maxPanDistance(): number {
    return 500 + Math.max(0, 1 / this.zoom - 1) * 320;
  }

  private clampPan(): void {
    const maxPanDist = this.maxPanDistance();
    this.panOffsetX = Math.max(-maxPanDist, Math.min(maxPanDist, this.panOffsetX));
    this.panOffsetY = Math.max(-maxPanDist, Math.min(maxPanDist, this.panOffsetY));
  }

  public panOffsetX: number = 0;
  public panOffsetY: number = 0;
  public isDragging: boolean = false;

  public pan(deltaX: number, deltaY: number): void {
    // deltaX & deltaY are screen pixel deltas, convert to world delta
    this.panOffsetX -= deltaX / this.zoom;
    this.panOffsetY -= deltaY / this.zoom;

    // Giới hạn khoảng kéo để người chơi không lạc mất tiệm
    this.clampPan();
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
    // Theo thời gian thật (không phụ thuộc số khung/giây): 144 Hz và 30 Hz bám cùng một tốc độ.
    const lerpSpeed = this.isDragging ? 1.0 : 1 - Math.exp(-10.0 * Math.max(0, dt));
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
