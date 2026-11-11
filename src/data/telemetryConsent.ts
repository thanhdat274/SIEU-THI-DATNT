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

/** Lược đồ một bản ghi ngày ẩn danh đúng `DayReport` (không tên, không uid, không vị trí). */
export interface TelemetrySample {
  v: 1; install: string; build: string; day: number; level: number; prestige: number;
  mode: string; realSec: number; sessions: number; moneyBand: number; customers: number;
  unhappy: number; walkouts: number; fainted: boolean; shortfall: boolean; inspectFail: boolean;
  panels: Record<string, number>; used: string[]; unlockedToday: number; fps: number;
  gfx: string; device: string;
}

/** Một BẢN GHI MẪU (đối tượng) — số minh hoạ, không phải số thật. `install` là mã giả danh của máy. */
export function telemetrySampleRecord(): TelemetrySample {
  return {
    v: 1, install: installId(), build: 'dev', day: 12, level: 47, prestige: 0, mode: 'alley',
    realSec: 1280, sessions: 3, moneyBand: 2, customers: 214, unhappy: 9, walkouts: 2,
    fainted: false, shortfall: false, inspectFail: false, panels: { shelf: 3, recipes: 5, orders: 2 },
    used: ['shelf', 'orders', 'preserve'], unlockedToday: 1, fps: 55, gfx: 'medium', device: 'phone',
  };
}

/** Bản ghi mẫu dạng JSON (giữ cho test lược đồ / chẩn đoán). */
export function telemetrySample(): string {
  return JSON.stringify(telemetrySampleRecord(), null, 2);
}

/** Một dòng "gửi những gì" đã dịch ra chữ dễ hiểu cho người chơi (không phải JSON thô). */
export interface TelemetryRow { key: string; label: string; value: string }

const MODE_LABEL: Record<string, string> = { alley: 'Ngõ nhỏ', street: 'Mặt phố', mall: 'Khu mua sắm' };
const GFX_LABEL: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', auto: 'Tự động' };
const DEVICE_LABEL: Record<string, string> = { phone: 'Điện thoại', tablet: 'Máy tính bảng', desktop: 'Máy tính' };
const PANEL_LABEL: Record<string, string> = { shelf: 'Kệ', recipes: 'Công thức', orders: 'Đơn hàng', store: 'Cửa tiệm', staff: 'Nhân viên' };
const USE_LABEL: Record<string, string> = { shelf: 'kệ', orders: 'đơn hàng', preserve: 'bảo quản', recipes: 'công thức', staff: 'nhân viên' };

function minText(sec: number): string {
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} giờ ${m % 60} phút` : `${m} phút`;
}
function yesNo(v: boolean): string { return v ? 'Có' : 'Không'; }

/** Các dòng giải thích "gửi những gì" — đã gom/sắp theo nghĩa, đúng số minh hoạ của `telemetrySampleRecord`. */
export function telemetrySampleRows(): TelemetryRow[] {
  const s = telemetrySampleRecord();
  return [
    { key: 'intro', label: 'Mục đích', value: 'Hiểu cách chơi để cải thiện game — không bán, không gắn với tên/tài khoản của bạn.' },
    { key: 'day', label: 'Ngày game', value: `Ngày thứ ${s.day}` },
    { key: 'level', label: 'Tiến độ', value: `Cấp ${s.level}${s.prestige > 0 ? `, kiếp ${s.prestige}` : ''}` },
    { key: 'mode', label: 'Chế độ', value: MODE_LABEL[s.mode] ?? s.mode },
    { key: 'playtime', label: 'Thời gian chơi hôm nay', value: minText(s.realSec) },
    { key: 'sessions', label: 'Số lần mở game', value: `${s.sessions} lần` },
    { key: 'customers', label: 'Khách phục vụ', value: `${s.customers} khách` },
    { key: 'unhappy', label: 'Khách không hài lòng', value: `${s.unhappy} khách` },
    { key: 'walkouts', label: 'Khách bỏ về không mua', value: `${s.walkouts} khách` },
    { key: 'fainted', label: 'Có người ngất xỉu', value: yesNo(s.fainted) },
    { key: 'shortfall', label: 'Hết hàng giữa giờ', value: yesNo(s.shortfall) },
    { key: 'inspectFail', label: 'Bị kiểm tra vệ sinh trượt', value: yesNo(s.inspectFail) },
    { key: 'panels', label: 'Số lần mở các bảng', value: Object.entries(s.panels).map(([k, n]) => `${PANEL_LABEL[k] ?? k} ${n}`).join(' · ') },
    { key: 'used', label: 'Hệ đã dùng hôm nay', value: s.used.map((u) => USE_LABEL[u] ?? u).join(', ') },
    { key: 'unlockedToday', label: 'Hệ mới mở hôm nay', value: `${s.unlockedToday} hệ` },
    { key: 'build', label: 'Phiên bản game', value: s.build },
    { key: 'fps', label: 'Độ mượt (khung hình/giây)', value: `${s.fps}` },
    { key: 'gfx', label: 'Mức đồ hoạ', value: GFX_LABEL[s.gfx] ?? s.gfx },
    { key: 'device', label: 'Loại máy', value: DEVICE_LABEL[s.device] ?? s.device },
    { key: 'moneyBand', label: 'Cỡ tiền trong game', value: `mức ${s.moneyBand}` },
    { key: 'install', label: 'Mã máy (ẩn danh)', value: `#${s.install.slice(0, 8)}…` },
  ];
}
