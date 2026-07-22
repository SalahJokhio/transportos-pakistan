import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';

/** Authenticates partner requests via the `X-API-Key` header. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    const result = await this.apiKeyService.validate(Array.isArray(key) ? key[0] : key);
    if (!result) throw new UnauthorizedException('Invalid or missing X-API-Key');
    req.apiCompanyId = result.companyId;
    return true;
  }
}
