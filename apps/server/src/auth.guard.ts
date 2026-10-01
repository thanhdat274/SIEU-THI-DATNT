import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccount } from './firebase-admin.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; gameAccount?: Awaited<ReturnType<typeof verifyAccount>> }>();
    try {
      request.gameAccount = await verifyAccount(request.headers.authorization);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or missing Firebase session');
    }
  }
}
