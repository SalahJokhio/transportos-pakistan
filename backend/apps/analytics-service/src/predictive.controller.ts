import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PredictiveService } from './predictive.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Predictive AI — breakdown / fatigue / complaint-volume, with confidence. */
@ApiTags('Predictive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('predict')
export class PredictiveController {
  constructor(private readonly predict: PredictiveService) {}

  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Get('overview')
  @ApiOperation({ summary: 'All predictions (breakdown, fatigue, complaints)' })
  overview(@Request() req) { return this.predict.overview(this.scope(req)); }
}
