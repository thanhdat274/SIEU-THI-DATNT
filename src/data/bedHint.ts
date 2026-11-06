import { SLEEP_FROM } from '../core/gameTypes';

/** Playtest P0 T3: gợi ý ở giường — trước 18h ẩn "[N] Đi ngủ" (chưa ngủ được, hiện ra chỉ gây hiểu lầm). */
export function bedHint(asleep: boolean, inAlley: boolean, minutes: number): string {
  if (asleep) return inAlley ? '💤 Chờ cả hẻm ngủ... [N] Dậy' : '💤 Đang ngủ...';
  return minutes >= SLEEP_FROM ? '[N] Đi ngủ' : '';
}
