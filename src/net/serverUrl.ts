/**
 * Địa chỉ server lưu cloud + hẻm online.
 *  - Để trống (mặc định): cùng địa chỉ với trang game. Dùng khi chạy dev (Vite chuyển tiếp /api, /ws)
 *    hoặc khi server tự phục vụ luôn trang game (tự host trên máy).
 *  - VITE_SERVER_URL=https://ten-server.onrender.com: trang game ở chỗ khác (vd. Vercel), server ở đây.
 */
const base = (import.meta.env.VITE_SERVER_URL ?? '').replace(/\/$/, '');

export const apiUrl = (path: string) => `${base}${path}`;

export function wsUrl() {
  if (base) return base.replace(/^http/, 'ws') + '/ws';
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}
