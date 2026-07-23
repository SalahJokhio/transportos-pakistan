import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExecutiveCopilotService } from './executive-copilot.service';
import { GenerativeService } from './generative.service';
import { PredictiveService } from './predictive.service';
import { SimulationService } from './simulation.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Unified AI Gateway (blueprint's single AI entry, line 963). One natural-
 * language endpoint classifies the intent and routes to the right AI service —
 * copilot (Q&A), generative (reports), predictive (risk), simulation (what-if).
 */
@ApiTags('AI Gateway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-gateway')
export class AiGatewayController {
  constructor(
    private readonly copilot: ExecutiveCopilotService,
    private readonly generative: GenerativeService,
    private readonly predictive: PredictiveService,
    private readonly simulation: SimulationService,
  ) {}

  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Post('ask')
  @ApiOperation({ summary: 'One AI entry: classifies the command and routes it' })
  async ask(@Body() body: { command: string }, @Request() req) {
    const cmd = (body?.command || '').toLowerCase();
    const companyId = this.scope(req);

    if (/(report|summary|draft|likho|banao)/.test(cmd)) {
      const r = await this.generative.executiveReport(companyId);
      return { handledBy: 'generative', intent: 'report', ...r };
    }
    if (/(predict|risk|breakdown|fatigue|kharabi|forecast complaint)/.test(cmd)) {
      const r = await this.predictive.overview(companyId);
      return { handledBy: 'predictive', intent: 'prediction', data: r };
    }
    if (/(what if|what-if|simulate|scenario|agar|eid|fuel price)/.test(cmd)) {
      const multiplier = Number((cmd.match(/(\d+(?:\.\d+)?)\s*x/) || [])[1]) || 2;
      const r = await this.simulation.demandSpike(multiplier, companyId);
      return { handledBy: 'simulation', intent: 'what-if', ...r };
    }
    // Default: the grounded Q&A copilot (KPIs + knowledge base).
    const r = await this.copilot.ask(body?.command || '', companyId);
    return { handledBy: 'copilot', intent: 'question', ...r };
  }
}
