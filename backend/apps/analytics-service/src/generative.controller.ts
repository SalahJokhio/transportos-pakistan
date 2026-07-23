import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GenerativeService } from './generative.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Generative AI: drafted narrative documents grounded in real data. */
@ApiTags('Generative')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('generate')
export class GenerativeController {
  constructor(private readonly gen: GenerativeService) {}

  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Get('executive-report')
  @ApiOperation({ summary: 'Draft an executive report from live analytics' })
  executive(@Request() req) { return this.gen.executiveReport(this.scope(req)); }

  @Get('incident-report/:reportId')
  @ApiOperation({ summary: 'Draft a formal incident report from a trip report' })
  incident(@Param('reportId') reportId: string) { return this.gen.incidentReport(reportId); }

  @Post('email')
  @ApiOperation({ summary: 'Draft a customer email (kind: delay|refund|thanks)' })
  email(@Body() body: { kind: string; context?: any }) { return this.gen.emailDraft(body?.kind || 'thanks', body?.context); }

  @Get('shift-plan')
  @ApiOperation({ summary: 'Draft a driver shift roster from the live roster' })
  shiftPlan(@Request() req) { return this.gen.shiftPlan(this.scope(req)); }

  @Get('maintenance-summary')
  @ApiOperation({ summary: 'Draft a maintenance summary from driver reports' })
  maintenance(@Request() req) { return this.gen.maintenanceSummary(this.scope(req)); }

  @Post('meeting-summary')
  @ApiOperation({ summary: 'Summarize meeting notes into decisions + action items' })
  meeting(@Body() body: { notes: string }) { return this.gen.meetingSummary(body?.notes || ''); }
}
