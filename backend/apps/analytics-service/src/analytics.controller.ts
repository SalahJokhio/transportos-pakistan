import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Revenue trend, status mix, top routes, payment mix (platform or per-operator)' })
  overview(@Query('companyId') companyId?: string) {
    return this.analytics.overview(companyId);
  }

  @Get('no-show')
  @ApiOperation({ summary: 'Per-route no-show rate + suggested overbooking % (#9)' })
  noShow(@Query('companyId') companyId?: string) {
    return this.analytics.noShow(companyId);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Booking funnel drop-off (search → seat → pay-start → paid)' })
  funnel(@Query('days') days?: string) {
    return this.analytics.funnel(days ? Number(days) : 14);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Per-route demand forecast (avg/trip + next-week projection)' })
  forecast(@Query('companyId') companyId?: string) {
    return this.analytics.forecast(companyId);
  }

  @Get('driver-scorecards')
  @ApiOperation({ summary: 'Driver rating / trips-completed scorecards' })
  driverScorecards(@Query('companyId') companyId?: string) {
    return this.analytics.driverScorecards(companyId);
  }
}
