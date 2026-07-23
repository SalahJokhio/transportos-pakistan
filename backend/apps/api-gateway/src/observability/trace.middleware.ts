import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Request-correlation tracing: assigns (or propagates) an X-Request-Id per
 * request, echoes it back on the response, and emits a structured access log
 * line with the id + latency. This is the code half of distributed tracing —
 * a downstream OpenTelemetry collector can key spans off the same header.
 */
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: any, res: any, next: () => void) {
    const id = req.headers['x-request-id'] || randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      // Skip the noisy scrape/probe endpoints.
      if (req.originalUrl === '/metrics' || req.originalUrl?.startsWith('/health/')) return;
      this.logger.log(`${id} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  }
}
