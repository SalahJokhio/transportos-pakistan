import { Injectable, ExecutionContext, CanActivate, UnauthorizedException } from '@nestjs/common';

function decodeJwt(token: string): any {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const payload = decodeJwt(authHeader.split(' ')[1]);
    if (!payload) throw new UnauthorizedException('Invalid token');
    request.user = payload;
    return true;
  }
}
