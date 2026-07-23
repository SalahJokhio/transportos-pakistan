import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AnalyticsService } from './analytics.service';
import { TripReport } from '../../fleet-service/src/entities/trip-report.entity';

/**
 * Generative AI (blueprint line 1198). Drafts narrative documents — executive
 * reports, incident reports, customer emails — grounded in real data. Uses
 * Claude when ANTHROPIC_API_KEY is set, else a solid templated draft.
 */
@Injectable()
export class GenerativeService {
  private readonly logger = new Logger(GenerativeService.name);

  constructor(
    private readonly analytics: AnalyticsService,
    @InjectRepository(TripReport) private readonly reportRepo: Repository<TripReport>,
  ) {}

  private rs(n: number) { return `Rs ${Math.round(Number(n)).toLocaleString('en-PK')}`; }

  private async claude(system: string, user: string): Promise<string | null> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    try {
      const res = await axios.post('https://api.anthropic.com/v1/messages',
        { model, max_tokens: 700, system, messages: [{ role: 'user', content: user }] },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 25000 });
      return (res.data?.content?.[0]?.text ?? '').trim() || null;
    } catch (e: any) { this.logger.warn(`generative claude failed: ${e.message}`); return null; }
  }

  // ── Executive report ────────────────────────────────────────────────
  async executiveReport(companyId?: string) {
    const [ov, fc] = await Promise.all([this.analytics.overview(companyId), this.analytics.forecast(companyId)]);
    const facts = {
      revenue: ov.totals.revenue, confirmed: ov.totals.confirmed, cancelled: ov.totals.cancelled,
      cancelRate: ov.totals.cancelRate, topRoutes: ov.topRoutes.slice(0, 3), paymentMix: ov.paymentMix,
      forecast: (fc as any).routes?.slice(0, 3) ?? [],
    };
    const via = await this.claude(
      'You are a transport company analyst. Write a crisp executive report (5-8 sentences) in professional English from the DATA only. No invented numbers.',
      `DATA:\n${JSON.stringify(facts)}`);
    const text = via ?? this.execTemplate(facts);
    return { type: 'executive_report', generatedAt: new Date().toISOString(), poweredBy: via ? 'claude' : 'template', text, facts };
  }

  private execTemplate(f: any): string {
    const top = f.topRoutes?.[0];
    return [
      `Executive Summary — ${new Date().toLocaleDateString('en-PK')}`,
      ``,
      `Over the recent period the operation recorded ${this.rs(f.revenue)} in confirmed revenue across ${f.confirmed} booking(s), against ${f.cancelled} cancellation(s) (cancel rate ${(f.cancelRate * 100).toFixed(1)}%).`,
      top ? `The strongest route is ${top.origin}→${top.destination}, contributing ${this.rs(top.revenue)} from ${top.bookings} booking(s).` : ``,
      f.paymentMix?.length ? `Collections came via ${f.paymentMix.map((p: any) => `${p.provider} (${this.rs(p.total)})`).join(', ')}.` : ``,
      f.forecast?.[0] ? `Demand is expected to remain highest on ${f.forecast[0].origin}→${f.forecast[0].destination}.` : ``,
      `Recommended focus: protect the top routes, and reduce cancellations where the rate is elevated.`,
    ].filter(Boolean).join('\n');
  }

  // ── Incident report ─────────────────────────────────────────────────
  async incidentReport(reportId: string) {
    const r = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!r) throw new NotFoundException('Trip report not found');
    const facts = { type: r.type, category: r.category, amount: Number(r.amount), notes: (r as any).notes ?? (r as any).description ?? '', date: r.createdAt, tripId: r.tripId };
    const via = await this.claude(
      'You are a fleet safety officer. Write a formal incident report (heading + short paragraphs: Summary, Details, Cost, Recommended action) from the DATA only.',
      `DATA:\n${JSON.stringify(facts)}`);
    const text = via ?? [
      `INCIDENT REPORT`, ``,
      `Type: ${facts.type} (${facts.category || 'general'})`,
      `Date: ${new Date(facts.date).toLocaleString('en-PK')}`,
      `Trip: ${facts.tripId}`,
      ``,
      `Summary: A ${facts.category || facts.type} was reported on the trip.`,
      facts.notes ? `Details: ${facts.notes}` : ``,
      facts.amount ? `Cost incurred: ${this.rs(facts.amount)}.` : ``,
      `Recommended action: inspect the vehicle and log corrective maintenance before the next dispatch.`,
    ].filter(Boolean).join('\n');
    return { type: 'incident_report', generatedAt: new Date().toISOString(), poweredBy: via ? 'claude' : 'template', text, facts };
  }

  // ── Customer email draft ────────────────────────────────────────────
  async emailDraft(kind: string, context: any = {}) {
    const via = await this.claude(
      'You draft short, warm, professional customer emails for a Pakistani bus company. Use the CONTEXT. Keep under 120 words.',
      `KIND: ${kind}\nCONTEXT: ${JSON.stringify(context)}`);
    const text = via ?? this.emailTemplate(kind, context);
    return { type: 'email_draft', kind, generatedAt: new Date().toISOString(), poweredBy: via ? 'claude' : 'template', text };
  }

  private emailTemplate(kind: string, c: any): string {
    const pnr = c.pnr ? ` (PNR ${c.pnr})` : '';
    if (/delay/.test(kind)) return `Dear ${c.name || 'Valued Customer'},\n\nWe’re sorry to inform you that your bus${pnr} is running late${c.delayMinutes ? ` by about ${c.delayMinutes} minutes` : ''}. Our team is doing its best to get you moving as soon as possible. Thank you for your patience.\n\nWarm regards,\nTransportOS`;
    if (/refund/.test(kind)) return `Dear ${c.name || 'Valued Customer'},\n\nYour refund${pnr}${c.amount ? ` of Rs ${Number(c.amount).toLocaleString()}` : ''} has been processed and credited to your wallet. It may take up to 3 working days to reflect. We hope to serve you again soon.\n\nWarm regards,\nTransportOS`;
    return `Dear ${c.name || 'Valued Customer'},\n\nThank you for travelling with TransportOS${pnr}. We appreciate your trust and look forward to welcoming you aboard again.\n\nWarm regards,\nTransportOS`;
  }
}
