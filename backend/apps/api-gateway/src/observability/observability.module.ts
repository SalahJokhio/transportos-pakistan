import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { TraceMiddleware } from './trace.middleware';
import { ObservabilityController } from './observability.controller';

/** Prometheus metrics + liveness/readiness probes + request tracing. */
@Module({
  controllers: [ObservabilityController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes('*'); // correlation id + access log for every request
  }
}
