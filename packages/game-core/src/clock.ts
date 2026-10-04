import { WorldTime } from '@game/shared';

export class GameClock {
  private time: WorldTime;
  private accumulatedSeconds: number = 0;
  private onDayChanged?: (newDay: number) => void;
  private onTimeChanged?: () => void;

  constructor(initialTime: WorldTime, onDayChanged?: (newDay: number) => void, onTimeChanged?: () => void) {
    this.time = { ...initialTime };
    this.onDayChanged = onDayChanged;
    this.onTimeChanged = onTimeChanged;
  }

  public getTime(): WorldTime {
    return { ...this.time };
  }

  public setTime(newTime: WorldTime): void {
    this.time = { ...newTime };
    this.accumulatedSeconds = 0;
    this.onTimeChanged?.();
  }

  public toggleStoreStatus(): boolean {
    this.time.isStoreOpen = !this.time.isStoreOpen;
    return this.time.isStoreOpen;
  }

  public setTimeScale(scale: number): void {
    this.time.timeScale = scale;
  }

  /** Một lần cập nhật tối đa 1 giờ thực: dt bất thường (tab treo, dữ liệu xấu) không được làm vòng lặp phút chạy vô hạn. */
  public static readonly MAX_UPDATE_SECONDS = 3600;

  /** Daily Routine: đồng hồ chạy liên tục 07:00 → 23:30 (không phụ thuộc cửa hàng mở) rồi dừng chờ ngủ. Mặc định tắt. */
  private routineMode = false;
  public static readonly ROUTINE_NIGHT_MINUTE = 23 * 60 + 30;

  /** Co-op mode: cả hai player phải ngủ mới chuyển ngày. */
  private coopMode = false;
  private coopAllSleeping = false;

  public setRoutineMode(on: boolean): void {
    this.routineMode = on;
  }

  public isRoutineMode(): boolean {
    return this.routineMode;
  }

  public setCoopMode(on: boolean): void {
    this.coopMode = on;
  }

  public isCoopMode(): boolean {
    return this.coopMode;
  }

  public setCoopAllSleeping(sleeping: boolean): void {
    this.coopAllSleeping = sleeping;
  }

  /** Routine: đã tới 23:30, đồng hồ đứng cho tới khi ngủ (`advanceToNextDay`). */
  public isNightHold(): boolean {
    if (!this.routineMode) return false;
    const currentMinute = this.time.hour * 60 + this.time.minute;
    if (currentMinute < GameClock.ROUTINE_NIGHT_MINUTE) return false;
    // Co-op mode: chỉ dừng nếu chưa có cả hai player ngủ
    if (this.coopMode && !this.coopAllSleeping) return true;
    // Normal mode: dừng luôn ở 23:30
    return true;
  }

  public update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (this.routineMode ? this.isNightHold() : !this.time.isStoreOpen) return;

    this.accumulatedSeconds += Math.min(dt, GameClock.MAX_UPDATE_SECONDS);

    // Advance 1 game minute every (60 / timeScale) real seconds
    // Default timeScale = 60 means 1 real second = 1 game minute
    const realSecPerGameMin = 60 / (this.time.timeScale || 60);

    while (this.accumulatedSeconds >= realSecPerGameMin) {
      this.accumulatedSeconds -= realSecPerGameMin;
      this.advanceMinute();
      if (this.isNightHold()) { this.accumulatedSeconds = 0; break; }
    }
  }

  private advanceMinute(): void {
    this.time.minute += 1;
    if (this.time.minute >= 60) {
      this.time.minute = 0;
      this.time.hour += 1;

      // Close store at 22:00 (10 PM); chế độ routine để ngày kết thúc khi nhân vật đi ngủ.
      if (this.time.hour >= 22 && !this.routineMode) {
        this.advanceToNextDay();
      }
    }
    this.onTimeChanged?.();
  }

  public advanceToNextDay(): void {
    this.time.day += 1;
    this.time.hour = 7; // Open next morning at 7:00 AM
    this.time.minute = 0;
    if (this.routineMode) { this.accumulatedSeconds = 0; this.time.isStoreOpen = false; } // 08:00 routine sẽ mở cửa
    if (this.onDayChanged) {
      this.onDayChanged(this.time.day);
    }
    this.onTimeChanged?.();
  }

  public formatTimeString(): string {
    const hh = this.time.hour.toString().padStart(2, '0');
    const mm = this.time.minute.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
