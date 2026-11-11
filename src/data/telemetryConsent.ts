/**
 * SPEC-TOI-UU §T1 (L2) — Đồng ý gửi "Số liệu ẩn danh" (scope `telemetry_anon`).
 *
 * MẶC ĐỊNH TẮT. Lựa chọn lưu cục bộ (`localStorage`) cho người chưa đăng nhập; người đã đăng
 * nhập sẽ được ghi thêm vào `consents` khi có server (L3 — `POST /t`). KHÔNG nằm trong
 * `CONSENT_SCOPES` (những scope bắt buộc để đăng nhập Google) — telemetry là tuỳ chọn, không
 * khoá chức năng nào.
 *
 * `install` là định danh giả danh sinh trên máy; KHÔNG được ghép với uid bất kỳ đâu.
 */
import { installId } from '../core/dayReport';

/** Scope đồng ý riêng cho telemetry ẩn danh (đọc trong màn "Xem gửi những gì"). */
export const TELEMETRY_SCOPE = 'telemetry_anon';

const CHOICE_KEY = 'th3d_telemetry'; // '1' = đồng ý gửi, còn lại = tắt.

/** Người chơi có đang đồng ý gửi số liệu ẩn danh không (mặc định KHÔNG). */
export function telemetryOptedIn(): boolean {
  try { return localStorage.getItem(CHOICE_KEY) === '1'; } catch { return false; }
}

/** Đặt lựa chọn telemetry (mặc định tắt). Không đụng uid/tài khoản. */
export function setTelemetryOptIn(on: boolean): void {
  try { localStorage.setItem(CHOICE_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** Đã từng hỏi chưa (hỏi đúng MỘT lần, sau ngày game thứ 2). */
export function telemetryAsked(): boolean {
  try { return localStorage.getItem('th3d_telemetry_asked') === '1'; } catch { return false; }
}
export function markTelemetryAsked(): void {
  try { localStorage.setItem('th3d_telemetry_asked', '1'); } catch { /* private mode */ }
}

/** Một BẢN GHI MẪU để hiện trong màn "Xem gửi những gì" — số minh hoạ, không phải số thật.
 *  Đúng lược đồ `DayReport` của game, mọi trường đều ẩn danh (không tên, không uid, không vị trí). */
export function telemetrySample(): string {
  return JSON.stringify({
    v: 1,
    install: installId(),
    build: 'dev',
    day: 12,
    level: 47,
    prestige: 0,
    mode: 'alley',
    realSec: 1280,
    sessions: 3,
    moneyBand: 2,
    customers: 214,
    unhappy: 9,
    walkouts: 2,
    fainted: false,
    shortfall: false,
    inspectFail: false,
    panels: { shelf: 3, recipes: 5, orders: 2 },
    used: ['shelf', 'orders', 'preserve'],
    unlockedToday: 1,
    fps: 55,
    gfx: 'medium',
    device: 'phone',
  }, null, 2);
}
