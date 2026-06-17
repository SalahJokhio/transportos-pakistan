import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  @Get('dashboard')
  @ApiOperation({ summary: 'Operator dashboard summary' })
  dashboard(@Query('companyId') companyId: string) {
    return { companyId, totalBookings: 0, revenue: 0, activeTrips: 0, message: 'Analytics coming soon' };
  }
}
