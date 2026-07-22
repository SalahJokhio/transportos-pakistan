import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';

/** Permissive decode guard — matches the operator/fleet controllers so
 *  req.user carries { sub, companyId, role } from the bearer token. */
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
    if (authHeader?.startsWith('Bearer ')) {
      const payload = decodeJwt(authHeader.split(' ')[1]);
      if (payload) request.user = payload;
    }
    return true;
  }
}
