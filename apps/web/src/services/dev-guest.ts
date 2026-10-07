/**
 * dev-guest — tài khoản khách ỔN ĐỊNH cho thử nghiệm chế độ 2 người trên localhost.
 *
 * Chỉ hoạt động khi chạy ở chế độ dev (Vite `import.meta.env.DEV` = true) và server chạy với
 * `GOOGLE_AUTH_BYPASS=true`. Server đọc header `X-Dev-Client-Id` để gán tài khoản `guest_<id>`
 * ổn định (xem `apps/server/src/auth.guard.ts`) — nhờ đó hai client trên cùng một máy (hai cấu hình
 * trình duyệt/ổ khác nhau) có thể vào cùng một hẻm online bằng hai định danh khác nhau và nói chuyện
 * voice với nhau mà KHÔNG cần đăng nhập Google thật. Bản build production (`import.meta.env.DEV = false`)
 * không bật chức năng này.
 *
 * Token ở đây chỉ là chuỗi giả — server bypass không xác minh nội dung token, chỉ cần header khớp.
 */
const STORAGE_KEY = 'devGuestClientId';

export interface DevGuestState {
  /** true khi đang ở chế độ khách dev có thể vào hẻm online 2 người. */
  active: boolean;
  /** Định danh client (a-z0-9, mặc định 'a'). Dùng làm X-Dev-Client-Id và hậu tố uid guest_<id>. */
  clientId: string;
}

export function devGuestIsEnabled(): boolean {
  return import.meta.env.DEV;
}

function readClientId(): string {
  if (typeof window === 'undefined') return 'a';
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  const candidate = stored ? stored.trim().toLowerCase().slice(0, 48).replace(/[^a-z0-9_-]/g, '') : '';
  return candidate || 'a';
}

export function getDevGuest(): DevGuestState {
  return { active: devGuestIsEnabled(), clientId: readClientId() };
}

/** Đổi định danh khách dev (a/b/c...) cho client hiện tại; trả về trạng thái mới. */
export function setDevGuestClientId(clientId: string): DevGuestState {
  const cleaned = clientId.trim().toLowerCase().slice(0, 48).replace(/[^a-z0-9_-]/g, '');
  const next = cleaned || 'a';
  if (typeof window !== 'undefined') window.localStorage?.setItem(STORAGE_KEY, next);
  return { active: devGuestIsEnabled(), clientId: next };
}

/** Header X-Dev-Client-Id để server gán tài khoản khách ổn định; undefined khi không dùng khách dev. */
export function devGuestHeader(): Record<string, string> | undefined {
  if (!devGuestIsEnabled()) return undefined;
  return { 'X-Dev-Client-Id': readClientId() };
}

/** Token giả cho chế độ khách dev (server bypass không xác minh nội dung). */
export function devGuestToken(): string {
  return `dev-guest-${readClientId()}-${Date.now()}`;
}
