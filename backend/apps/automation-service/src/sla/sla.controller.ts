import { Controller, Get, Put, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** SLA + Escalation Engine console. */
@ApiTags('SLA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sla')
export class SlaController {
  constructor(private readonly sla: SlaService) {}

  private scope(req: any): string | null {
    if (req.user?.role === 'SUPER_ADMIN') return null;
    return req.user?.companyId || req.user?.sub || null;
  }

  @Get('config')
  @ApiOperation({ summary: 'Effective SLA tiers' })
  getConfig(@Request() req) { return this.sla.getConfig(this.scope(req)); }

  @Put('config')
  @ApiOperation({ summary: 'Update SLA tiers' })
  updateConfig(@Body() body: any, @Request() req) { return this.sla.updateConfig(this.scope(req), body); }

  @Get('status')
  @ApiOperation({ summary: 'Open items with SLA state (OK/AT_RISK/BREACHED)' })
  status(@Request() req) { return this.sla.status(this.scope(req)); }

  @Get('escalations')
  @ApiOperation({ summary: 'Recent escalations' })
  escalations(@Request() req) { return this.sla.listEscalations(this.scope(req)); }

  @Post('run')
  @ApiOperation({ summary: 'Run the SLA monitor now (escalate current breaches)' })
  run() { return this.sla.runNow(); }
}
