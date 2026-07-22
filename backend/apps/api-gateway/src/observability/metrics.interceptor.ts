import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/** Records latency + status for every HTTP request into MetricsService. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();
    // Use the matched route pattern (low cardinality), not the raw URL.
    const route = req.route?.path || req.baseUrl || 'unmatched';
    const method = req.method;

    const finish = () => this.metrics.record(method, route, res.statusCode ?? 0, Date.now() - start);
    return next.handle().pipe(tap({ next: finish, error: finish }));
  }
}
