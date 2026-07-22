import { Injectable, ExecutionContext, CanActivate, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

/** Restrict a route to specific roles (used with JwtAuthGuard). */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Verifies the HS256 JWT signature with JWT_SECRET and its expiry — a missing or
 * forged token is now rejected (previously this guard trusted any token). If the
 * route declares @Roles(...), the token's role must be one of them.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

    const payload = this.verify(authHeader.split(' ')[1]);
    if (!payload) throw new UnauthorizedException('Invalid or expired token');
    request.user = payload;

    const required = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (required?.length && !required.includes(payload.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }

  private verify(token: string): any | null {
    try {
      const [h, p, sig] = token.split('.');
      if (!h || !p || !sig) return null;
      const secret = process.env.JWT_SECRET || 'transport-os-secret';
      const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
      if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
      if (payload.exp && Date.now() / 1000 > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }
}
