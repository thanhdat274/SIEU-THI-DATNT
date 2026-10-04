import { Vector2D, TILE_SIZE } from '@game/shared';
import { NEIGHBORHOOD_PX, ZOOM_LEVELS, ZOOM_MAX, ZOOM_MIN } from '@game/data';

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
      this.targetZoom = this.zoom;
    }
  }

  /** Zoom đích: `zoom` trượt dần về đây (xem `updateZoom`). Nút +/− và nhãn UI đọc giá trị này. */
  public targetZoom: number = 2.0;
  /** Điểm màn hình (px CSS, tính từ góc trên-trái canvas) được giữ đứng yên khi zoom; null = tâm màn hình. */
  private zoomAnchor: { x: number; y: number } | null = null;

  /** Đặt zoom tức thì, liên tục (không kéo về mức nguyên): dùng cho pinch và hook QA. */
  public setZoom(newZoom: number, anchor?: { x: number; y: number }): void {
    this.isCustomZoom = true;
    if (anchor) this.zoomAnchor = anchor;
    const z = this.clampZoom(newZoom);
    this.targetZoom = z;
    this.applyZoom(z);
  }

  /** Đặt zoom đích; `zoom` trượt dần tới đó và giữ điểm `anchor` dưới con trỏ đứng yên. */
  public zoomTo(target: number, anchor?: { x: number; y: number } | null): void {
    this.isCustomZoom = true;
    if (anchor !== undefined) this.zoomAnchor = anchor;
    this.targetZoom = this.clampZoom(target);
  }

  /** Nhân zoom đích với `factor` (>1 gần hơn), tính từ đích hiện tại để các nấc cuộn liên tiếp cộng dồn mượt. */
  public zoomBy(factor: number, anchor?: { x: number; y: number } | null): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.zoomTo(this.targetZoom * factor, anchor);
  }

  /** Bước lên mức zoom kế tiếp (gần hơn) tính từ zoom đích; `steps` mức mỗi lần. Zoom quanh tâm màn hình. */
  public zoomIn(steps: number = 1): number {
    return this.stepZoom(Math.max(1, Math.round(steps)));
  }

  /** Bước xuống mức zoom kế tiếp (xa hơn). */
  public zoomOut(steps: number = 1): number {
    return this.stepZoom(-Math.max(1, Math.round(steps)));
  }

  private stepZoom(steps: number): number {
    let next = this.targetZoom;
    for (let i = 0; i < Math.abs(steps); i++) {
      const levels = ZOOM_LEVELS;
      if (steps > 0) next = levels.find((l) => l > next + 1e-3) ?? levels[levels.length - 1];
      else next = [...levels].reverse().find((l) => l < next - 1e-3) ?? levels[0];
    }
    this.zoomTo(next, null);
    return this.targetZoom;
  }

  /** Trượt `zoom` về `targetZoom` theo hàm mũ trong không gian log (độc lập số khung/giây). Trả về true nếu zoom vừa đổi. */
  public updateZoom(dt: number): boolean {
    if (this.zoom === this.targetZoom) return false;
    const diff = Math.log(this.targetZoom / this.zoom);
    if (Math.abs(diff) < 0.002) {
      this.applyZoom(this.targetZoom);
      return true;
    }
    const k = 1 - Math.exp(-18 * Math.max(0, dt));
    this.applyZoom(this.zoom * Math.exp(diff * k));
    return true;
  }

  private clampZoom(z: number): number {
    if (!Number.isFinite(z) || z <= 0) return this.zoom;
    return Math.max(this.minZoom, Math.min(this.maxZoom, z));
  }

  /**
   * Đổi `zoom` và bù camera để điểm màn hình `zoomAnchor` vẫn nhìn vào cùng một điểm thế giới.
   * Camera bám người chơi theo `follow` (x đích = người + pan − nửa khung/zoom) nên phải dịch cả `x/y` hiện tại lẫn `panOffset`,
   * nếu không `follow` sẽ kéo điểm đó trôi đi.
   */
  private applyZoom(z1: number): void {
    const z0 = this.zoom;
    if (z1 === z0) return;
    const sx = this.zoomAnchor?.x ?? this.viewportWidth / 2;
    const sy = this.zoomAnchor?.y ?? this.viewportHeight / 2;
    const d = 1 / z0 - 1 / z1;
    this.x += sx * d;
    this.y += sy * d;
    this.panOffsetX += (sx - this.viewportWidth / 2) * d;
    this.panOffsetY += (sy - this.viewportHeight / 2) * d;
    this.zoom = z1;
    this.clampPan();
  }

  /** Khoảng kéo tối đa (px thế giới): đủ để kéo tới mọi góc khu phố (người chơi đi được khắp khu phố); nút về tiệm đặt lại bằng `resetPan`. */
  public maxPanDistance(): number {
    return Math.max(NEIGHBORHOOD_PX.x1 - NEIGHBORHOOD_PX.x0, NEIGHBORHOOD_PX.y1 - NEIGHBORHOOD_PX.y0);
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
