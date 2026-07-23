import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AnalyticsService } from './analytics.service';
import { KnowledgeService } from '../../automation-service/src/knowledge/knowledge.service';

const SYSTEM_PROMPT = `You are the Executive Copilot for TransportOS, an intercity bus platform in Pakistan.
You answer a business owner's questions about their operation.
RULES:
- Answer ONLY from the DATA JSON provided in the user message. Never invent numbers.
- If the data does not contain the answer, say so briefly and suggest what to check.
- Reply in the user's language (English, Urdu, or Roman Urdu), matching their question.
- Be concise and executive: lead with the number/answer, then one line of context.
- Money is in Pakistani Rupees (Rs). Format large numbers readably.`;

interface Snapshot {
  scope: string;
  totals: any;
  revenueByDay: any[];
  topRoutes: any[];
  paymentMix: any[];
  bookingsByStatus: Record<string, number>;
  forecast: any[];
}

/**
 * Executive AI Copilot (Milestone 9). Answers natural-language questions by
 * grounding Claude on a real KPI snapshot from AnalyticsService — so the
 * numbers are always true. Falls back to a keyword router when no key is set.
 */
@Injectable()
export class ExecutiveCopilotService {
  private readonly logger = new Logger(ExecutiveCopilotService.name);

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly knowledge: KnowledgeService,
  ) {}

  /** Compact KPI snapshot the copilot reasons over. */
  async snapshot(companyId?: string): Promise<Snapshot> {
    const [overview, forecast] = await Promise.all([
      this.analytics.overview(companyId),
      this.analytics.forecast(companyId),
    ]);
    return {
      scope: companyId ? 'this operator' : 'the whole platform',
      totals: overview.totals,
      revenueByDay: overview.revenueByDay,
      topRoutes: overview.topRoutes,
      paymentMix: overview.paymentMix,
      bookingsByStatus: overview.bookingsByStatus,
      forecast: (forecast as any).routes ?? [],
    };
  }

  async ask(question: string, companyId?: string) {
    const data = await this.snapshot(companyId);
    // RAG: pull relevant company knowledge to ground policy/how-to questions.
    const kb = await this.knowledge.retrieve(companyId ?? null, question, 3).catch(() => []);
    const viaClaude = await this.askClaude(question, data, kb);
    if (viaClaude) return { answer: viaClaude, data, sources: kb.map((k) => k.title), poweredBy: 'claude' as const };
    return { answer: this.fallback(question, data, kb), data, sources: kb.map((k) => k.title), poweredBy: 'rules' as const };
  }

  // ── Claude (grounded on KPIs + knowledge base) ─────────────────────
  private async askClaude(question: string, data: Snapshot, kb: any[]): Promise<string | null> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const kbBlock = kb.length
      ? `\n\nKNOWLEDGE BASE (cite these for policy/how-to):\n${kb.map((k) => `# ${k.title}\n${k.body}`).join('\n\n')}`
      : '';
    try {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `DATA (scope: ${data.scope}):\n${JSON.stringify(data)}${kbBlock}\n\nQUESTION: ${question}`,
          }],
        },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 20000 },
      );
      return (res.data?.content?.[0]?.text ?? '').trim() || null;
    } catch (e: any) {
      this.logger.warn(`Copilot Claude call failed, using fallback: ${e.message}`);
      return null;
    }
  }

  // ── Keyword fallback (no API key) ──────────────────────────────────
  private rs(n: number) { return `Rs ${Math.round(n).toLocaleString('en-PK')}`; }

  private fallback(question: string, d: Snapshot, kb: any[] = []): string {
    const q = question.toLowerCase();
    const today = d.revenueByDay[d.revenueByDay.length - 1];

    // Prefer a matching knowledge article for policy/how-to questions — even when
    // the wording also contains KPI keywords (e.g. "refund policy" has "refund").
    const isKpi = /(revenue|kamai|aamdani|sale|income|paisa|route|profit|cancel|refund|payment|forecast|demand|booking|ticket|occupancy)/.test(q);
    const isKnowledgeQ = /(policy|rule|process|procedure|sop|guideline|how|kaise|kaisay|what is|kya hai|kia hai|explain|batao|bataye)/.test(q);
    if (kb.length && (isKnowledgeQ || !isKpi)) {
      const top = kb[0];
      const snippet = top.body.length > 340 ? top.body.slice(0, 340) + '…' : top.body;
      return `From "${top.title}": ${snippet}`;
    }

    if (/(revenue|kamai|aamdani|sale|income|paisa)/.test(q)) {
      if (/(today|aaj|aj)/.test(q) && today) {
        return `Aaj (${today.day}) ka revenue ${this.rs(today.revenue)} hai — ${today.bookings} confirmed booking(s). Total (14 din): ${this.rs(d.totals.revenue)}.`;
      }
      return `Total confirmed revenue (${d.scope}) ${this.rs(d.totals.revenue)} hai across ${d.totals.confirmed} booking(s).`;
    }
    if (/(route|profitable|best|top|popular)/.test(q) && d.topRoutes.length) {
      const top = d.topRoutes[0];
      const list = d.topRoutes.slice(0, 3).map((r, i) => `${i + 1}. ${r.origin}→${r.destination} (${this.rs(r.revenue)})`).join('  ');
      return `Sabse profitable route: ${top.origin}→${top.destination} — ${this.rs(top.revenue)} from ${top.bookings} booking(s).  Top 3: ${list}`;
    }
    if (/(cancel|refund|cancellation)/.test(q)) {
      return `Cancel rate ${(d.totals.cancelRate * 100).toFixed(1)}% — ${d.totals.cancelled} cancelled of ${d.totals.total} total.`;
    }
    if (/(payment|jazzcash|easypaisa|wallet|method)/.test(q) && d.paymentMix.length) {
      const mix = d.paymentMix.map((p) => `${p.provider}: ${this.rs(p.total)} (${p.count})`).join('  ');
      return `Payment mix — ${mix}`;
    }
    if (/(forecast|demand|next|agle|prediction|kal)/.test(q) && d.forecast.length) {
      const f = d.forecast[0];
      return `Highest-demand route: ${f.origin}→${f.destination} — ${f.projectedNextWeek ?? f.bookings} projected next week.`;
    }
    if (/(booking|ticket|sold)/.test(q)) {
      return `${d.totals.confirmed} confirmed booking(s), ${d.totals.cancelled} cancelled (${d.totals.total} total).`;
    }
    // default: an executive summary
    return `Snapshot (${d.scope}): revenue ${this.rs(d.totals.revenue)}, ${d.totals.confirmed} confirmed / ${d.totals.cancelled} cancelled, cancel rate ${(d.totals.cancelRate * 100).toFixed(1)}%.` +
      (d.topRoutes[0] ? ` Top route ${d.topRoutes[0].origin}→${d.topRoutes[0].destination} (${this.rs(d.topRoutes[0].revenue)}).` : '');
  }
}
