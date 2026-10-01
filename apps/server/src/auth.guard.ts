import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccount } from './firebase-admin.js';
import { httpAccountLimiter } from './rate-limit.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; gameAccount?: Awaited<ReturnType<typeof verifyAccount>> }>();
    try {
      request.gameAccount = await verifyAccount(request.headers.authorization);
    } catch {
      throw new UnauthorizedException('Invalid or missing Firebase session');
    }
    if (!httpAccountLimiter.take(request.gameAccount.uid)) {
      throw new HttpException('Quá nhiều yêu cầu, vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
