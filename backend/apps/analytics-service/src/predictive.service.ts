import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../booking-service/src/entities/booking.entity';

/**
 * Predictive AI (blueprint line 1185): breakdown probability, driver-fatigue
 * risk, complaint-volume forecast. Grounded in real history, every prediction
 * carries a confidence label — not certainty.
 */
@Injectable()
export class PredictiveService {
  constructor(@InjectRepository(Booking) private readonly repo: Repository<Booking>) {}
  private q<T = any>(sql: string, p: any[] = []): Promise<T[]> { return this.repo.query(sql, p); }
  private n(v: any) { return Number(v) || 0; }
  private conf(sample: number) { return sample >= 10 ? 'HIGH' : sample >= 3 ? 'MEDIUM' : 'LOW'; }

  /** Per-bus breakdown probability from incident history + vehicle age. */
  async breakdownRisk(companyId?: string) {
    const rows = await this.q(
      `SELECT b.id, b."registrationNumber" reg, b."manufacturingYear" yr,
              COALESCE((SELECT COUNT(*) FROM trip_reports tr JOIN trips t2 ON t2.id::text=tr."tripId"
                        WHERE t2."busId"=b.id::text AND tr.type='incident' AND tr."createdAt">=now()-interval '90 days'),0) incidents
       FROM buses b WHERE b."isActive"=true ${companyId ? `AND b."companyId"=$1` : ``}`,
      companyId ? [companyId] : []);
    const year = new Date().getFullYear();
    return {
      note: 'Directional probabilities with confidence — not certainty.',
      buses: rows.map((r: any) => {
        const incidents = this.n(r.incidents);
        const age = Math.max(0, year - this.n(r.yr));
        // base 5% + 12% per recent incident + 1.2% per year of age, capped.
        const prob = Math.min(0.95, 0.05 + incidents * 0.12 + age * 0.012);
        return {
          bus: r.reg, incidents90d: incidents, ageYears: age,
          breakdownProbability: Math.round(prob * 100), unit: '%',
          confidence: this.conf(incidents + Math.min(age, 5)),
          suggestion: prob >= 0.4 ? 'Schedule preventive inspection' : 'Monitor',
        };
      }).sort((a: any, b: any) => b.breakdownProbability - a.breakdownProbability),
    };
  }

  /** Per-driver fatigue risk from trips driven in the last 7 days. */
  async fatigueRisk(companyId?: string) {
    const rows = await this.q(
      `SELECT t."driverId" did, COUNT(*)::int trips7,
              COALESCE(SUM(EXTRACT(EPOCH FROM (t."estimatedArrivalTime"-t."departureTime"))/3600),0) hours7
       FROM trips t
       WHERE t."departureTime">=now()-interval '7 days' AND t."driverId" IS NOT NULL AND t."driverId"<>'unassigned'
       ${companyId ? `AND t."companyId"=$1` : ``}
       GROUP BY t."driverId" ORDER BY trips7 DESC`,
      companyId ? [companyId] : []);
    return {
      note: 'Fatigue risk from 7-day trip load; confirm with the driver.',
      drivers: rows.map((r: any) => {
        const trips = this.n(r.trips7), hours = this.n(r.hours7);
        const score = Math.min(1, trips / 14 + hours / 60); // ~2 trips/day or ~60h/wk → high
        const level = score >= 0.75 ? 'HIGH' : score >= 0.45 ? 'MEDIUM' : 'LOW';
        return { driverId: r.did, trips7d: trips, hours7d: Math.round(hours), fatigueRisk: level, confidence: this.conf(trips) };
      }),
    };
  }

  /** Complaint-volume forecast from the recent support-ticket trend. */
  async complaintForecast() {
    const rows = await this.q(
      `SELECT to_char(date_trunc('week',"createdAt"),'YYYY-MM-DD') wk, COUNT(*)::int n
       FROM support_tickets WHERE "createdAt">=now()-interval '5 weeks'
       GROUP BY 1 ORDER BY 1`);
    const counts = rows.map((r: any) => this.n(r.n));
    const avg = counts.length ? counts.reduce((a: number, b: number) => a + b, 0) / counts.length : 0;
    const last = counts.length ? counts[counts.length - 1] : 0;
    // simple trend: weight recent week + average
    const projected = Math.round(last * 0.6 + avg * 0.4);
    return {
      note: 'Next-week complaint volume projection (directional).',
      weeklyCounts: counts, average: Math.round(avg * 10) / 10,
      projectedNextWeek: projected, confidence: this.conf(counts.length * 2),
    };
  }

  async overview(companyId?: string) {
    const [breakdown, fatigue, complaints] = await Promise.all([
      this.breakdownRisk(companyId), this.fatigueRisk(companyId), this.complaintForecast(),
    ]);
    return { breakdown, fatigue, complaints };
  }
}
