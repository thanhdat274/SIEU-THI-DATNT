/** Logic thuần của voice chat (không phụ thuộc trình duyệt) để test được. */

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** `VITE_ICE_SERVERS` là JSON mảng RTCIceServer; sai định dạng thì dùng STUN mặc định (thêm TURN sau này không phải sửa code). */
export function parseIceServers(raw: string | undefined | null): RTCIceServer[] {
  if (!raw || !raw.trim()) return DEFAULT_ICE_SERVERS;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length === 0) return DEFAULT_ICE_SERVERS;
    const valid = value.filter((item): item is RTCIceServer => {
      if (!item || typeof item !== 'object') return false;
      const urls = (item as { urls?: unknown }).urls;
      return typeof urls === 'string' || (Array.isArray(urls) && urls.length > 0 && urls.every(url => typeof url === 'string'));
    });
    return valid.length === value.length ? valid : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
}

/** Bên có accountId nhỏ hơn là bên gọi (tạo offer) để hai bên không cùng gửi offer. */
export function isOfferer(selfId: string, peerId: string): boolean {
  return selfId < peerId;
}

export interface SpeakingDetector { update(level: number, nowMs: number): boolean }

/** Báo "đang nói" khi âm lượng vượt ngưỡng và giữ thêm `holdMs` sau lần vượt cuối để chỉ báo không nhấp nháy. */
export function createSpeakingDetector(threshold = 0.02, holdMs = 400): SpeakingDetector {
  let lastLoudAt = -Infinity;
  return {
    update(level, nowMs) {
      if (level >= threshold) lastLoudAt = nowMs;
      return nowMs - lastLoudAt < holdMs;
    },
  };
}

/** RMS 0..1 từ mẫu miền thời gian 8-bit của AnalyserNode (128 là im lặng). */
export function rmsLevel(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let index = 0; index < samples.length; index++) {
    const centered = (samples[index] - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / samples.length);
}

/** Thông báo lỗi mic dễ hiểu từ lỗi getUserMedia. */
export function describeMicError(error: unknown, hasMediaDevices: boolean): string {
  if (!hasMediaDevices) return 'Mic chỉ dùng được khi mở game bằng địa chỉ HTTPS (có ổ khóa).';
  const name = error && typeof error === 'object' ? (error as { name?: string }).name : undefined;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Bạn đã từ chối quyền dùng mic. Hãy cho phép mic trong cài đặt trình duyệt rồi thử lại.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy micro trên thiết bị.';
  if (name === 'NotReadableError') return 'Micro đang được ứng dụng khác sử dụng.';
  return 'Không bật được mic.';
}
