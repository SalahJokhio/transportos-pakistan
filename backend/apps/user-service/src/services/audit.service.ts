import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, tap } from 'rxjs';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  log(entry: Partial<AuditLog>) {
    // Fire-and-forget: auditing must never break the request it records.
    this.repo.save(this.repo.create(entry)).catch(() => undefined);
  }

  list(limit = 100) {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}

/**
 * Records every mutating admin request (POST/PATCH/PUT/DELETE) after it succeeds:
 * who (actor from the JWT), what (method + path), and the target id. Read-only
 * GETs are not logged. Attach with @UseInterceptors(AuditInterceptor).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const mutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    return next.handle().pipe(
      tap(() => {
        if (!mutating) return;
        this.audit.log({
          actorId: req.user?.sub,
          actorRole: req.user?.role,
          action: `${req.method} ${req.route?.path || req.path || req.url}`,
          targetId: req.params?.id || req.params?.companyId || null,
          ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0],
        });
      }),
    );
  }
}
