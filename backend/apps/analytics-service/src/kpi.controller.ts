import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KpiService } from './kpi.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** KPI Engine — the operating KPIs the blueprint lists, computed from live data. */
@ApiTags('KPI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kpi')
export class KpiController {
  constructor(private readonly kpi: KpiService) {}

  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Get('overview')
  @ApiOperation({ summary: 'All operating KPIs' })
  overview(@Request() req) { return this.kpi.overview(this.scope(req)); }
}
