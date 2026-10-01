/**
 * Giới hạn tần suất trong bộ nhớ (cửa sổ cố định), không cần phụ thuộc ngoài. Chỉ đúng với một tiến trình server:
 * nếu chạy nhiều instance, mỗi instance đếm riêng (xem THONG-KE.md I-15).
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { windowStart: number; count: number }>();
  private lastSweep = 0;

  constructor(private readonly limit: number, private readonly windowMs: number) {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0) throw new Error('Invalid rate limit config');
  }

  /** Ghi nhận một yêu cầu cho `key`; trả về false nếu vượt hạn mức trong cửa sổ hiện tại. */
  take(key: string, now = Date.now()): boolean {
    this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (bucket.count >= this.limit) return false;
    bucket.count += 1;
    return true;
  }

  /** Số khóa đang theo dõi (dùng cho kiểm thử). */
  get size(): number { return this.buckets.size; }

  private sweep(now: number) {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) this.buckets.delete(key);
    }
  }
}

/** Hạn mức mặc định, có thể ghi đè bằng biến môi trường (số nguyên dương). */
const envInt = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

export const RATE_LIMITS = {
  /** Mọi yêu cầu HTTP theo IP, trước khi xác thực (bảo vệ bước verify token). */
  httpPerIpPerMin: envInt('RATE_LIMIT_HTTP_IP_PER_MIN', 600),
  /** Mọi yêu cầu HTTP đã xác thực theo tài khoản. */
  httpPerAccountPerMin: envInt('RATE_LIMIT_HTTP_ACCOUNT_PER_MIN', 240),
  /** Lệnh commit theo tài khoản (mỗi lệnh ghi cả save lên Mongo). */
  commitPerAccountPerMin: envInt('RATE_LIMIT_COMMIT_PER_MIN', 120),
  /** Thông điệp WebSocket theo kết nối mỗi giây (input ~10 Hz là bình thường). */
  wsMessagesPerSocketPerSec: envInt('RATE_LIMIT_WS_PER_SEC', 40),
  /** Số lần vượt hạn mức WS trong 10 giây thì đóng kết nối. */
  wsViolationsBeforeClose: envInt('RATE_LIMIT_WS_VIOLATIONS', 20),
} as const;

/** Kích thước tối đa thân JSON HTTP (save đầy đủ + sổ cái) và một thông điệp WebSocket. */
export const MAX_HTTP_BODY = '2mb';
export const MAX_WS_PAYLOAD_BYTES = 64 * 1024;

export const httpIpLimiter = new RateLimiter(RATE_LIMITS.httpPerIpPerMin, 60_000);
export const httpAccountLimiter = new RateLimiter(RATE_LIMITS.httpPerAccountPerMin, 60_000);
export const commitLimiter = new RateLimiter(RATE_LIMITS.commitPerAccountPerMin, 60_000);
