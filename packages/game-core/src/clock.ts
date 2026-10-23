import { WorldTime } from '@game/shared';
import { BUSINESS_HOURS, NIGHT_END_HOUR, NIGHT_START_HOUR, NIGHT_TIME_SCALE_MULTIPLIER } from '@game/data';

export class GameClock {
  private time: WorldTime;
  private accumulatedSeconds: number = 0;
  private onDayChanged?: (newDay: number) => void;
  private onTimeChanged?: () => void;

  constructor(initialTime: WorldTime, onDayChanged?: (newDay: number) => void, onTimeChanged?: () => void) {
    this.time = GameClock.migrateTime(initialTime);
    this.onDayChanged = onDayChanged;
    this.onTimeChanged = onTimeChanged;
  }

  /** Tốc độ 1x = timeScale 90 (1 giây thực = 1,5 phút game ban ngày; ban đêm ×3). Save cũ lưu 60 (1x) / 120 (2x) được quy đổi sang 90 / 180. */
  public static readonly BASE_TIME_SCALE = 90;

  private static migrateTime(t: WorldTime): WorldTime {
    const timeScale = t.timeScale === 60 ? 90 : t.timeScale === 120 ? 180 : t.timeScale;
    return { ...t, timeScale };
  }

  public getTime(): WorldTime {
    return { ...this.time };
  }

  public setTime(newTime: WorldTime): void {
    this.time = GameClock.migrateTime(newTime);
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

  /** Routine: luôn chạy (kể cả ban đêm) cho tới 06:00; nhân vật tự về nhà ngủ lúc 23:30 nhưng ngày chỉ chốt ở 06:00. */
  public isNightHold(): boolean {
    return false;
  }

  /** Pha đêm 22:00–06:00 (OpenSpec `staff-shifts`): cửa đóng nhưng đồng hồ vẫn chạy, ngày chưa chốt. */
  public isNightPhase(time: WorldTime = this.time): boolean {
    return time.hour >= NIGHT_START_HOUR || time.hour < NIGHT_END_HOUR;
  }

  /** Giây thực cho một phút game; ban đêm trôi nhanh hơn theo `NIGHT_TIME_SCALE_MULTIPLIER` (cả chế độ thường và routine). */
  private realSecondsPerGameMinute(): number {
    const base = this.time.timeScale || GameClock.BASE_TIME_SCALE;
    return 60 / (this.isNightPhase() ? base * NIGHT_TIME_SCALE_MULTIPLIER : base);
  }

  public update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Chế độ routine: đồng hồ luôn chạy (kể cả ban đêm) tới 06:00 mới chốt ngày.
    // Chế độ thường: chỉ chạy khi tiệm mở HOẶC đang pha đêm (22:00–06:00), để ban đêm chơi được.
    if (!this.routineMode && !this.time.isStoreOpen && !this.isNightPhase()) return;

    this.accumulatedSeconds += Math.min(dt, GameClock.MAX_UPDATE_SECONDS);

    // 1 phút game mỗi (60 / tốc độ hiệu dụng) giây thực; tốc độ hiệu dụng đổi khi vào/ra pha đêm giữa vòng lặp.
    while (this.accumulatedSeconds >= this.realSecondsPerGameMinute()) {
      this.accumulatedSeconds -= this.realSecondsPerGameMinute();
      this.advanceMinute();
    }
  }

  private advanceMinute(): void {
    this.time.minute += 1;
    if (this.time.minute >= 60) {
      this.time.minute = 0;
      this.time.hour += 1;
      if (this.time.hour >= 24) this.time.hour -= 24; // qua nửa đêm vẫn cùng ngày (00:00–06:00 thuộc ngày N)

      if (this.time.hour === NIGHT_START_HOUR && !this.routineMode) {
        // 22:00 (chế độ thường): đóng cửa và vào pha đêm; routine tự đóng cửa qua lịch sinh hoạt.
        this.time.isStoreOpen = false;
      } else if (this.time.hour === NIGHT_END_HOUR) {
        // 06:00: chốt ngày cho CẢ hai chế độ, sang 07:00. Chế độ thường mở cửa lại; routine để 08:00 mở.
        this.advanceToNextDay({ openStore: !this.routineMode });
      }
    }
    this.onTimeChanged?.();
  }

  /**
   * Chuyển ngày: `day + 1`, 07:00. Chế độ thường mở cửa lại nếu được yêu cầu (`openStore`) hoặc nếu đang là pha đêm
   * (ngủ/qua đêm sớm); chế độ sinh hoạt ngày đóng cửa chờ routine mở lúc 08:00 như cũ.
   */
  public advanceToNextDay(options: { openStore?: boolean } = {}): void {
    const wasNight = this.isNightPhase();
    this.time.day += 1;
    this.time.hour = BUSINESS_HOURS.openHour; // Open next morning at 7:00 AM
    this.time.minute = 0;
    if (this.routineMode) {
      this.time.isStoreOpen = false;
    } else {
      if (options.openStore || wasNight) this.time.isStoreOpen = true;
    }
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
