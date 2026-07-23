import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiFeedback } from './ai.entities';
import { Booking } from '../../../booking-service/src/entities/booking.entity';

/**
 * AI Memory + Governance.
 * - Memory: a personalization profile computed live from a user's booking
 *   history (frequent route, preferred payment, typical spend) — the doc's
 *   "AI Memory" (line 1168), computed rather than guessed.
 * - Governance: an accept/reject feedback loop over AI suggestions (line 1233).
 */
@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiFeedback) private readonly feedbackRepo: Repository<AiFeedback>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
  ) {}

  // ── AI Memory (personalization profile) ─────────────────────────────
  async memoryProfile(userId: string) {
    const rows = await this.bookingRepo.query(
      `SELECT r."originCity" o, r."destinationCity" d, b."paymentMode" pm, b."finalAmount" amt,
              to_char(b."createdAt",'Dy') dow, b."boardingPoint" bp
       FROM bookings b JOIN trips t ON t.id::text=b."tripId" JOIN routes r ON r.id::text=t."routeId"
       WHERE b."passengerId"=$1 ORDER BY b."createdAt" DESC LIMIT 100`, [userId]);
    if (!rows.length) return { userId, known: false, message: 'No booking history yet.' };

    const mode = (arr: string[]) => {
      const c: Record<string, number> = {}; arr.filter(Boolean).forEach((x) => (c[x] = (c[x] || 0) + 1));
      return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    };
    const routes = rows.map((r: any) => `${r.o}→${r.d}`);
    const spends = rows.map((r: any) => Number(r.amt) || 0);
    return {
      userId, known: true, bookings: rows.length,
      frequentRoute: mode(routes),
      preferredPayment: mode(rows.map((r: any) => r.pm)),
      preferredBoarding: mode(rows.map((r: any) => r.bp)),
      typicalTravelDay: mode(rows.map((r: any) => (r.dow || '').trim())),
      avgSpend: Math.round(spends.reduce((a, b) => a + b, 0) / spends.length),
      suggestion: mode(routes) ? `Frequently travels ${mode(routes)} — offer a quick-rebook and relevant deals.` : null,
    };
  }

  // ── AI Governance (feedback loop) ───────────────────────────────────
  record(userId: string | null, dto: { kind: string; refId?: string; accepted: boolean; note?: string }) {
    return this.feedbackRepo.save(this.feedbackRepo.create({
      userId: userId ?? null, kind: dto.kind, refId: dto.refId, accepted: !!dto.accepted, note: dto.note,
    }));
  }

  async stats() {
    const rows = await this.feedbackRepo.query(
      `SELECT kind, COUNT(*)::int total, COUNT(*) FILTER (WHERE accepted)::int accepted FROM ai_feedback GROUP BY kind`);
    const totalAll = rows.reduce((s: number, r: any) => s + Number(r.total), 0);
    const acceptedAll = rows.reduce((s: number, r: any) => s + Number(r.accepted), 0);
    return {
      total: totalAll,
      accepted: acceptedAll,
      acceptanceRate: totalAll ? Math.round((acceptedAll / totalAll) * 100) : 0,
      byKind: rows.map((r: any) => ({ kind: r.kind, total: Number(r.total), accepted: Number(r.accepted), rate: Math.round((Number(r.accepted) / Number(r.total)) * 100) })),
    };
  }
}
