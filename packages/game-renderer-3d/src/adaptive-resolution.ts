/**
 * Bộ điều khiển tự hạ độ phân giải khi FPS thấp (P2 / parity với adaptResolution của Pixi).
 * - Đo FPS trung bình trong cửa sổ 3 giây: nếu < 45 thì tăng hardwareScalingLevel một nấc (×1.5 so với mặc định).
 * - Nếu FPS > 58 liên tục trong 10 giây thì trả lại mức mặc định.
 * - Tạm dừng khi tab ẩn hoặc có modal (tránh hạ nhầm khi trình duyệt throttle).
 */
export interface AdaptiveResolutionOptions {
  /** Hệ số nhân khi hạ độ phân giải (mặc định 1.5). */
  scaleFactor?: number;
  /** Ngưỡng FPS dưới mức này trong 3s sẽ hạ độ phân giải (mặc định 45). */
  lowFpsThreshold?: number;
  /** Thời gian đo FPS trung bình để quyết định hạ (giây, mặc định 3.0). */
  lowFpsWindowSeconds?: number;
  /** Ngưỡng FPS trên mức này liên tục để phục hồi (mặc định 58). */
  highFpsThreshold?: number;
  /** Thời gian FPS cao liên tục cần thiết để phục hồi (giây, mặc định 10.0). */
  highFpsRequiredSeconds?: number;
}

export class AdaptiveResolutionController {
  private readonly scaleFactor: number;
  private readonly lowFpsThreshold: number;
  private readonly lowFpsWindowSeconds: number;
  private readonly highFpsThreshold: number;
  private readonly highFpsRequiredSeconds: number;

  private isScaledDown = false;
  private evalWindowTime = 0;
  private frameCount = 0;
  private highFpsDuration = 0;

  constructor(options: AdaptiveResolutionOptions = {}) {
    this.scaleFactor = options.scaleFactor ?? 1.5;
    this.lowFpsThreshold = options.lowFpsThreshold ?? 45;
    this.lowFpsWindowSeconds = options.lowFpsWindowSeconds ?? 3.0;
    this.highFpsThreshold = options.highFpsThreshold ?? 58;
    this.highFpsRequiredSeconds = options.highFpsRequiredSeconds ?? 10.0;
  }

  /** Trạng thái hiện tại có đang bị hạ độ phân giải hay không. */
  public get isDownscaled(): boolean {
    return this.isScaledDown;
  }

  /** Hệ số tỉ lệ phần cứng hiện tại (1.0 = mặc định, scaleFactor = đã hạ). */
  public get currentFactor(): number {
    return this.isScaledDown ? this.scaleFactor : 1.0;
  }

  /** Tính giá trị hardwareScalingLevel thực tế dựa trên baseScaling mặc định. */
  public resolveScalingLevel(baseScaling: number): number {
    return baseScaling * this.currentFactor;
  }

  /**
   * Cập nhật đo đạc mỗi khung hình.
   * @param dt Khoảng thời gian từ khung hình trước (giây)
   * @param instantFps FPS tức thời của khung hình
   * @param isPaused true nếu tab đang ẩn hoặc đang mở modal đối thoại
   * @returns true nếu trạng thái hạ/phục hồi độ phân giải vừa thay đổi trong khung hình này
   */
  public update(dt: number, instantFps: number, isPaused = false): boolean {
    if (isPaused || dt <= 0 || !Number.isFinite(instantFps)) {
      this.evalWindowTime = 0;
      this.frameCount = 0;
      this.highFpsDuration = 0;
      return false;
    }

    const prevDownscaled = this.isScaledDown;

    // 1. Cửa sổ đo FPS trung bình (mặc định 3s)
    this.evalWindowTime += dt;
    this.frameCount++;

    if (this.evalWindowTime >= this.lowFpsWindowSeconds - 1e-5) {
      const avgFps = this.frameCount / this.evalWindowTime;
      this.evalWindowTime = 0;
      this.frameCount = 0;

      if (avgFps < this.lowFpsThreshold && !this.isScaledDown) {
        this.isScaledDown = true;
        this.highFpsDuration = 0;
      }
    }

    // 2. Theo dõi phục hồi khi FPS > 58 liên tục (mặc định 10s)
    if (this.isScaledDown) {
      if (instantFps > this.highFpsThreshold) {
        this.highFpsDuration += dt;
        if (this.highFpsDuration >= this.highFpsRequiredSeconds - 1e-5) {
          this.isScaledDown = false;
          this.highFpsDuration = 0;
        }
      } else {
        this.highFpsDuration = 0;
      }
    }

    return prevDownscaled !== this.isScaledDown;
  }

  /** Đặt lại toàn bộ trạng thái về mặc định. */
  public reset(): void {
    this.isScaledDown = false;
    this.evalWindowTime = 0;
    this.frameCount = 0;
    this.highFpsDuration = 0;
  }
}
