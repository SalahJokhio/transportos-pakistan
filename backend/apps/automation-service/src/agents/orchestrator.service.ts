import { Injectable, Logger } from '@nestjs/common';
import { AgentsService, AgentInsight } from './agents.service';
import { EventBusService } from '../services/event-bus.service';

export interface CollaborationResult {
  trigger: string;
  runAt: string;
  agentsConsulted: string[];
  criticalCount: number;
  warningCount: number;
  briefing: string;              // synthesized situational summary
  topActions: AgentInsight[];    // the most severe actionable insights across agents
  byDomain: Record<string, { critical: number; warning: number; headline?: string }>;
}

/**
 * Multi-Agent Collaboration (blueprint Layer 5). Instead of each department
 * agent working alone, the orchestrator runs them together for a trigger,
 * fuses their findings into one situational briefing + a prioritized action
 * list, and emits a MULTI_AGENT_BRIEFING event so the rest of the stack reacts.
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly agents: AgentsService,
    private readonly eventBus: EventBusService,
  ) {}

  private readonly DOMAINS = ['dispatch', 'finance', 'fleet', 'hr', 'crm', 'workshop'] as const;

  async collaborate(trigger: string, companyId?: string): Promise<CollaborationResult> {
    const results = await Promise.all(this.DOMAINS.map((d) => this.agents.run(d as any, companyId)));
    const byDomain: CollaborationResult['byDomain'] = {};
    const all: (AgentInsight & { domain: string })[] = [];

    this.DOMAINS.forEach((d, i) => {
      const insights = results[i].filter((x) => !x.id.endsWith('-ok'));
      const critical = insights.filter((x) => x.severity === 'critical').length;
      const warning = insights.filter((x) => x.severity === 'warning').length;
      const headline = insights.sort(this.bySeverity)[0]?.title;
      byDomain[d] = { critical, warning, headline };
      insights.forEach((x) => all.push({ ...x, domain: d }));
    });

    const ranked = all.sort(this.bySeverity);
    const criticalCount = all.filter((x) => x.severity === 'critical').length;
    const warningCount = all.filter((x) => x.severity === 'warning').length;
    const topActions = ranked.filter((x) => x.action).slice(0, 5);

    const briefing = this.synthesize(trigger, criticalCount, warningCount, byDomain, ranked);

    const result: CollaborationResult = {
      trigger, runAt: new Date().toISOString(),
      agentsConsulted: [...this.DOMAINS], criticalCount, warningCount,
      briefing, topActions, byDomain,
    };

    this.eventBus.emit('MULTI_AGENT_BRIEFING', {
      trigger, criticalCount, warningCount, headline: ranked[0]?.title ?? 'All clear',
    }, { companyId: companyId ?? null, source: 'orchestrator' }).catch(() => undefined);

    return result;
  }

  private bySeverity = (a: AgentInsight, b: AgentInsight) => {
    const rank = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
    return (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3);
  };

  /** Fuse the agents' findings into one executive briefing. */
  private synthesize(trigger: string, crit: number, warn: number, byDomain: any, ranked: any[]): string {
    if (crit === 0 && warn === 0) {
      return `Coordinated check (${trigger}): all six departments report normal. No critical or warning items across dispatch, finance, fleet, HR, CRM, or workshop.`;
    }
    const hotDomains = Object.entries(byDomain)
      .filter(([, v]: any) => v.critical + v.warning > 0)
      .sort((a: any, b: any) => (b[1].critical * 10 + b[1].warning) - (a[1].critical * 10 + a[1].warning))
      .map(([d, v]: any) => `${d}${v.critical ? ` (${v.critical} critical)` : ''}`);

    const lead = ranked[0];
    const parts = [
      `Coordinated response to "${trigger}": ${crit} critical + ${warn} warning item(s) across ${hotDomains.length} department(s).`,
      hotDomains.length ? `Focus areas: ${hotDomains.join(', ')}.` : '',
      lead ? `Most urgent: ${lead.title} — ${lead.detail}` : '',
      crit > 0 ? 'Recommend acting on the critical items first.' : 'No critical items; monitor the warnings.',
    ];
    return parts.filter(Boolean).join(' ');
  }
}
