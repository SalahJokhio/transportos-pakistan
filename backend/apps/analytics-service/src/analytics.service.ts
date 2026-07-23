import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../booking-service/src/entities/booking.entity';

/**
 * Read-only analytics over the live booking/trip/payment data. Works platform-
 * wide (admin) or scoped to one operator (companyId), powering the reports and
 * operator dashboards. All queries are parameterized.
 */
@Injectable()
export class AnalyticsService {
  constructor(@InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>) {}

  async overview(companyId?: string) {
    // When scoped to an operator, every booking query joins trips by company.
    const scope = companyId
      ? { join: `JOIN trips t ON t.id::text = b."tripId"`, where: `AND t."companyId" = $1`, params: [companyId] }
      : { join: ``, where: ``, params: [] as any[] };

    const [revenueByDay, statusCounts, topRoutes, paymentMix, totals] = await Promise.all([
      this.bookingRepo.query(
        `SELECT to_char(b."createdAt"::date, 'YYYY-MM-DD') AS day,
                COALESCE(SUM(b."finalAmount"), 0)::numeric AS revenue,
                COUNT(*)::int AS bookings
         FROM bookings b ${scope.join}
         WHERE b.status = 'CONFIRMED' ${scope.where}
           AND b."createdAt" >= now() - interval '14 days'
         GROUP BY day ORDER BY day`,
        scope.params,
      ),
      this.bookingRepo.query(
        `SELECT b.status AS status, COUNT(*)::int AS n
         FROM bookings b ${scope.join}
         WHERE 1=1 ${scope.where}
         GROUP BY b.status`,
        scope.params,
      ),
      this.bookingRepo.query(
        `SELECT r.name AS route, r."originCity" AS origin, r."destinationCity" AS destination,
                COUNT(b.id)::int AS bookings, COALESCE(SUM(b."finalAmount"), 0)::numeric AS revenue
         FROM bookings b
         JOIN trips t ON t.id::text = b."tripId"
         JOIN routes r ON r.id::text = t."routeId"
         WHERE b.status = 'CONFIRMED' ${companyId ? `AND t."companyId" = $1` : ``}
         GROUP BY r.name, r."originCity", r."destinationCity"
         ORDER BY revenue DESC LIMIT 5`,
        companyId ? [companyId] : [],
      ),
      // Payment mix is platform-wide (payments aren't operator-scoped in schema).
      this.bookingRepo.query(
        `SELECT provider, COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::numeric AS total
         FROM payments WHERE status = 'COMPLETED' GROUP BY provider`,
      ),
      this.bookingRepo.query(
        `SELECT
           COUNT(*) FILTER (WHERE b.status = 'CONFIRMED')::int AS confirmed,
           COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS cancelled,
           COUNT(*)::int AS total,
           COALESCE(SUM(b."finalAmount") FILTER (WHERE b.status = 'CONFIRMED'), 0)::numeric AS revenue
         FROM bookings b ${scope.join}
         WHERE 1=1 ${scope.where}`,
        scope.params,
      ),
    ]);

    const t = totals?.[0] ?? {};
    const cancelRate = Number(t.total) > 0 ? Number(t.cancelled) / Number(t.total) : 0;

    return {
      totals: {
        revenue: Number(t.revenue ?? 0),
        confirmed: Number(t.confirmed ?? 0),
        cancelled: Number(t.cancelled ?? 0),
        total: Number(t.total ?? 0),
        cancelRate: Number(cancelRate.toFixed(3)),
      },
      revenueByDay: revenueByDay.map((r: any) => ({ day: r.day, revenue: Number(r.revenue), bookings: r.bookings })),
      bookingsByStatus: Object.fromEntries(statusCounts.map((s: any) => [s.status, s.n])),
      topRoutes: topRoutes.map((r: any) => ({
        route: r.route, origin: r.origin, destination: r.destination,
        bookings: r.bookings, revenue: Number(r.revenue),
      })),
      paymentMix: paymentMix.map((p: any) => ({ provider: p.provider, count: p.n, total: Number(p.total) })),
    };
  }

  /**
   * Demand forecast per route: recent avg confirmed bookings per trip and a
   * naive next-week projection (avg/trip × trips run in the last 30 days).
   */
  async forecast(companyId?: string) {
    const rows = await this.bookingRepo.query(
      `SELECT r.name AS route, r."originCity" AS origin, r."destinationCity" AS destination,
              COUNT(DISTINCT t.id)::int AS trips,
              COUNT(b.id) FILTER (WHERE b.status='CONFIRMED')::int AS bookings
       FROM trips t
       JOIN routes r ON r.id::text = t."routeId"
       LEFT JOIN bookings b ON b."tripId" = t.id::text
       WHERE t."departureTime" >= now() - interval '30 days' ${companyId ? `AND t."companyId" = $1` : ``}
       GROUP BY r.name, r."originCity", r."destinationCity"
       ORDER BY bookings DESC LIMIT 10`,
      companyId ? [companyId] : [],
    );
    return {
      // Predictions carry a confidence score + range (not certainty): the more
      // trips we've observed, the tighter the estimate.
      note: 'Projections include a confidence score and range based on sample size — treat as directional, not certain.',
      routes: rows.map((r: any) => {
        const trips = Number(r.trips) || 0;
        const bookings = Number(r.bookings) || 0;
        const avgPerTrip = trips ? Math.round((bookings / trips) * 10) / 10 : 0;
        const projectedNextWeek = Math.round(avgPerTrip * Math.max(1, Math.round(trips / 4)));

        // Sample-size driven confidence.
        const score = trips >= 12 ? 0.85 : trips >= 5 ? 0.6 : trips >= 1 ? 0.35 : 0;
        const label = score >= 0.75 ? 'HIGH' : score >= 0.5 ? 'MEDIUM' : score > 0 ? 'LOW' : 'NONE';
        const margin = Math.round(projectedNextWeek * (1 - score) * 0.6);
        return {
          route: r.route, origin: r.origin, destination: r.destination, trips, bookings, avgPerTrip,
          projectedNextWeek,
          confidence: score,
          confidenceLabel: label,
          rangeLow: Math.max(0, projectedNextWeek - margin),
          rangeHigh: projectedNextWeek + margin,
        };
      }),
    };
  }

  /**
   * No-show rate per route: CONFIRMED bookings on departed trips that were never
   * boarded (boardedAt IS NULL). Drives a suggested overbooking % so operators
   * can safely oversell seats they expect to go empty.
   */
  async noShow(companyId?: string) {
    const rows = await this.bookingRepo.query(
      `SELECT r.name AS route, r."originCity" AS origin, r."destinationCity" AS destination,
              COUNT(b.id) FILTER (WHERE b.status='CONFIRMED')::int AS confirmed,
              COUNT(b.id) FILTER (WHERE b.status='CONFIRMED' AND b."boardedAt" IS NULL)::int AS no_show
       FROM trips t
       JOIN routes r ON r.id::text = t."routeId"
       JOIN bookings b ON b."tripId" = t.id::text
       WHERE t."departureTime" < now() ${companyId ? `AND t."companyId" = $1` : ``}
       GROUP BY r.name, r."originCity", r."destinationCity"
       HAVING COUNT(b.id) FILTER (WHERE b.status='CONFIRMED') > 0
       ORDER BY no_show DESC LIMIT 15`,
      companyId ? [companyId] : [],
    );
    return {
      routes: rows.map((r: any) => {
        const confirmed = Number(r.confirmed);
        const noShow = Number(r.no_show);
        const rate = confirmed ? noShow / confirmed : 0;
        // Suggest overselling ~70% of the observed no-show rate, capped at 20%.
        const suggestedOverbookPct = Math.min(20, Math.round(rate * 70));
        return { route: r.route, origin: r.origin, destination: r.destination, confirmed, noShow, noShowRate: Math.round(rate * 100), suggestedOverbookPct };
      }),
    };
  }

  /** Booking funnel: counts per stage + conversion from search → paid. */
  async funnel(days = 14) {
    const rows = await this.bookingRepo.query(
      `SELECT stage, COUNT(*)::int AS n FROM funnel_events
       WHERE "createdAt" >= now() - ($1 || ' days')::interval GROUP BY stage`,
      [String(days)],
    );
    const by: Record<string, number> = {};
    for (const r of rows) by[r.stage] = Number(r.n);
    const search = by.search || 0;
    const order = ['search', 'seat_select', 'pay_start', 'pay_done'];
    return {
      stages: order.map((s) => ({ stage: s, count: by[s] || 0, pctOfSearch: search ? Math.round(((by[s] || 0) / search) * 100) : 0 })),
      conversion: search ? Math.round(((by.pay_done || 0) / search) * 100) : 0,
    };
  }

  /** Driver scorecards: rating, review count, trips completed, on-time rate. */
  async driverScorecards(companyId?: string) {
    const reviews = await this.bookingRepo.query(
      `SELECT "driverId", COUNT(*)::int AS reviews, ROUND(AVG(rating)::numeric, 2) AS "avgRating"
       FROM driver_reviews GROUP BY "driverId"`,
    );
    const trips = await this.bookingRepo.query(
      `SELECT "driverId",
              COUNT(*) FILTER (WHERE status='ARRIVED')::int AS completed,
              COUNT(*)::int AS total
       FROM trips ${companyId ? `WHERE "companyId" = $1` : ``} GROUP BY "driverId"`,
      companyId ? [companyId] : [],
    );
    const tripBy = new Map(trips.map((t: any) => [t.driverId, t]));
    const ids = new Set([...reviews.map((r: any) => r.driverId), ...trips.map((t: any) => t.driverId)]);
    return {
      drivers: [...ids].filter(Boolean).map((id) => {
        const rv = reviews.find((r: any) => r.driverId === id);
        const tr: any = tripBy.get(id) || {};
        return {
          driverId: id,
          avgRating: rv ? Number(rv.avgRating) : null,
          reviews: rv ? Number(rv.reviews) : 0,
          tripsCompleted: Number(tr.completed || 0),
          tripsTotal: Number(tr.total || 0),
        };
      }),
    };
  }
}
