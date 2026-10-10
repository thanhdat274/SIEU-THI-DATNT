import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccount } from './firebase-admin.js';
import { httpAccountLimiter } from './rate-limit.js';

/** Chuyển `X-Dev-Client-Id` thành một định danh khách an toàn (a-z0-9 và gạch dưới, tối đa 48 ký tự); rỗng nếu header thiếu/không hợp lệ. */
export function sanitizeDevClientId(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase().slice(0, 48).replace(/[^a-z0-9_-]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  // Set env var GOOGLE_AUTH_BYPASS=true to skip Firebase verification (local testing only)
  private readonly bypass = process.env.GOOGLE_AUTH_BYPASS === 'true';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string; 'x-dev-client-id'?: string }; gameAccount?: Awaited<ReturnType<typeof verifyAccount>> }>();

    if (this.bypass) {
      // Tài khoản khách ỔN ĐỊNH theo X-Dev-Client-Id để hai client trên localhost có thể vào cùng hẻm
      // bằng hai định danh khác nhau (chỉ bật khi GOOGLE_AUTH_BYPASS=true, KHÔNG bao giờ đặt ở production).
      const devClientId = sanitizeDevClientId(request.headers['x-dev-client-id']);
      if (devClientId) {
        request.gameAccount = { uid: `guest_${devClientId}`, name: `Khách ${devClientId.toUpperCase()} (dev)`, email: `guest-${devClientId}@local-dev.test` };
        return true;
      }
      // Không gửi X-Dev-Client-Id: rơi về khách random (hành vi cũ, dùng cho test một lần).
      request.gameAccount = { uid: 'guest_local_' + Date.now(), name: 'Local Demo', email: 'local-test@example.com' };
      return true;
    }

    try {
      request.gameAccount = await verifyAccount(request.headers.authorization);
    } catch (error) {
      console.warn('[auth] token bị từ chối:', error instanceof Error ? error.message : error);
      throw new UnauthorizedException('Invalid or missing Firebase session');
    }
    if (!httpAccountLimiter.take(request.gameAccount.uid)) {
      console.warn(`[rate-limit] chặn tài khoản ${request.gameAccount.uid}`);
      throw new HttpException('Quá nhiều yêu cầu, vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
