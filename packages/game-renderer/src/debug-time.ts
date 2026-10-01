/**
 * Ghi đè giờ/ngày CHỈ để vẽ (ánh sáng, bóng cây, mưa) phục vụ kiểm tra bằng mắt. Không đổi đồng hồ game, save, ngày
 * hay thời tiết mô phỏng; không có override thì renderer dùng thời gian thật của simulation. Bật bởi apps/web ở
 * chế độ dev (xem main.tsx).
 */
export interface DebugVisualTime {
  day: number;
  hour: number;
  minute: number;
  /** Cường độ mưa 0..1; bỏ trống thì giữ mưa của simulation. */
  rain?: number;
}

let override: DebugVisualTime | null = null;

export function setDebugVisualTime(value: DebugVisualTime | null): void {
  override = value
    ? {
        day: Math.max(1, Math.floor(value.day)),
        hour: Math.min(24, Math.max(0, value.hour)),
        minute: Math.min(59, Math.max(0, Math.floor(value.minute))),
        rain: value.rain === undefined ? undefined : Math.min(1, Math.max(0, value.rain)),
      }
    : null;
}

export function getDebugVisualTime(): DebugVisualTime | null {
  return override;
}
