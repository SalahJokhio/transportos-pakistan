import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Department AI Agents console (Dispatch / Finance / Fleet). */
@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Get('overview')
  @ApiOperation({ summary: 'Severity counts across all agents' })
  overview(@Request() req) {
    return this.agents.overview(this.scope(req));
  }

  @Get(':domain')
  @ApiOperation({ summary: 'Run an agent (dispatch|finance|fleet) → insights' })
  run(@Param('domain') domain: any, @Request() req) {
    return this.agents.run(domain, this.scope(req));
  }

  @Post('act')
  @ApiOperation({ summary: 'Execute an insight’s recommended action (→ alert or workflow + event)' })
  act(@Body() body: { action: any; domain?: string }, @Request() req) {
    const actor = { userId: req.user?.sub || req.user?.id, role: req.user?.role, companyId: this.scope(req) ?? null };
    return this.agents.act(actor, body?.action, body?.domain);
  }
}
