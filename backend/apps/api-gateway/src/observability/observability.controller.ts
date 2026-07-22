import { Controller, Get, Header } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Observability endpoints for production ops:
 *  - /metrics       Prometheus scrape target
 *  - /health/live   liveness (process is up)
 *  - /health/ready  readiness (dependencies reachable)
 * These sit OUTSIDE the /api/v1 prefix (see main.ts exclude list).
 */
@ApiTags('Observability')
@Controller()
export class ObservabilityController {
  constructor(
    private readonly metrics: MetricsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Prometheus metrics' })
  metricsEndpoint() {
    return this.metrics.render();
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'live', uptime: process.uptime() };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB)' })
  async ready() {
    const checks: Record<string, string> = {};
    let ok = true;
    try { await this.dataSource.query('SELECT 1'); checks.database = 'up'; }
    catch { checks.database = 'down'; ok = false; }
    return { status: ok ? 'ready' : 'not-ready', checks };
  }
}
