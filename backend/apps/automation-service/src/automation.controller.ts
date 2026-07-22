import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationService } from './services/automation.service';
import { RulesEngineService } from './services/rules-engine.service';
import { EventBusService } from './services/event-bus.service';
import { CreateRuleDto, SimulateEventDto } from './dto/automation.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Rules + Event Engine console. Operators manage rules for their own tenant;
 * a SUPER_ADMIN manages platform-wide rules (companyId = null) or, with
 * ?scope=company, their own. Scoping keeps one tenant from seeing another's.
 */
@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly automation: AutomationService,
    private readonly rulesEngine: RulesEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  /** Resolve which tenant scope this request writes to. */
  private scope(req: any): string | null {
    const role = req.user?.role;
    const companyId = req.user?.companyId || req.user?.sub || null;
    // Super admins operate on platform-wide rules by default.
    if (role === 'SUPER_ADMIN') return null;
    return companyId;
  }

  // ── Rules ──────────────────────────────────────────────────────────
  @Get('rules')
  @ApiOperation({ summary: 'List rules visible to this tenant (own + platform)' })
  listRules(@Request() req) {
    return this.automation.listRules(this.scope(req));
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a no-code IF/THEN rule' })
  createRule(@Body() dto: CreateRuleDto, @Request() req) {
    return this.automation.createRule(this.scope(req), dto as any);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update / enable / disable a rule' })
  updateRule(@Param('id') id: string, @Body() patch: Partial<CreateRuleDto>, @Request() req) {
    return this.automation.updateRule(id, this.scope(req), patch as any);
  }

  @Delete('rules/:id')
  removeRule(@Param('id') id: string) {
    return this.automation.removeRule(id);
  }

  // ── Simulate (dry-run) + manual emit (testing) ─────────────────────
  @Post('simulate')
  @ApiOperation({ summary: 'Dry-run: which rules would fire for this event (no side-effects)' })
  simulate(@Body() dto: SimulateEventDto, @Request() req) {
    return this.rulesEngine.simulate(this.scope(req), dto.type, dto.payload);
  }

  @Post('emit')
  @ApiOperation({ summary: 'Manually emit an event (fires matching rules for real)' })
  emit(@Body() dto: SimulateEventDto, @Request() req) {
    return this.eventBus.emit(dto.type, dto.payload, { companyId: this.scope(req), source: 'manual' });
  }

  // ── Event log + alert inbox ────────────────────────────────────────
  @Get('events')
  @ApiOperation({ summary: 'Recent events (the Event Engine log)' })
  events(@Query('type') type: string, @Request() req) {
    return this.eventBus.list(this.scope(req), type);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Alert inbox (output of alert rule actions)' })
  alerts(@Query('unread') unread: string, @Request() req) {
    return this.automation.listAlerts(this.scope(req), unread === 'true');
  }

  @Patch('alerts/:id/read')
  markRead(@Param('id') id: string) {
    return this.automation.markAlertRead(id);
  }
}
