import { WorldTime } from '@game/shared';

export class GameClock {
  private time: WorldTime;
  private accumulatedSeconds: number = 0;
  private onDayChanged?: (newDay: number) => void;

  constructor(initialTime: WorldTime, onDayChanged?: (newDay: number) => void) {
    this.time = { ...initialTime };
    this.onDayChanged = onDayChanged;
  }

  public getTime(): WorldTime {
    return { ...this.time };
  }

  public setTime(newTime: WorldTime): void {
    this.time = { ...newTime };
  }

  public toggleStoreStatus(): boolean {
    this.time.isStoreOpen = !this.time.isStoreOpen;
    return this.time.isStoreOpen;
  }

  public update(dt: number): void {
    if (!this.time.isStoreOpen) {
      return;
    }

    this.accumulatedSeconds += dt;

    // Advance 1 game minute every (60 / timeScale) real seconds
    // Default timeScale = 60 means 1 real second = 1 game minute
    const realSecPerGameMin = 60 / (this.time.timeScale || 60);

    while (this.accumulatedSeconds >= realSecPerGameMin) {
      this.accumulatedSeconds -= realSecPerGameMin;
      this.advanceMinute();
    }
  }

  private advanceMinute(): void {
    this.time.minute += 1;
    if (this.time.minute >= 60) {
      this.time.minute = 0;
      this.time.hour += 1;

      // Close store at 22:00 (10 PM)
      if (this.time.hour >= 22) {
        this.advanceToNextDay();
      }
    }
  }

  public advanceToNextDay(): void {
    this.time.day += 1;
    this.time.hour = 7; // Open next morning at 7:00 AM
    this.time.minute = 0;
    if (this.onDayChanged) {
      this.onDayChanged(this.time.day);
    }
  }

  public formatTimeString(): string {
    const hh = this.time.hour.toString().padStart(2, '0');
    const mm = this.time.minute.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
