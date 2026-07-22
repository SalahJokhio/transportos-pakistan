import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from '../entities/bus.entity';
import { Trip } from '../entities/trip.entity';
import { TripReport } from '../entities/trip-report.entity';
import { BookingService } from '../../../booking-service/src/services/booking.service';

@Injectable()
export class FleetAnalyticsService {
  constructor(
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(TripReport) private readonly reportRepo: Repository<TripReport>,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * Scheduling conflicts (#10): the same bus or driver assigned to two trips
   * whose time windows overlap — a real dispatch error. Returns the clashing
   * pairs so the operator can reassign before the day of travel.
   */
  async scheduleConflicts(companyId: string) {
    const conflict = (col: 'busId' | 'driverId') =>
      this.tripRepo.query(
        `SELECT a.id AS "tripA", b.id AS "tripB", a."${col}" AS resource,
                a."departureTime" AS "aDep", b."departureTime" AS "bDep"
         FROM trips a
         JOIN trips b ON a."${col}" = b."${col}" AND a.id < b.id
         WHERE a."companyId" = $1 AND b."companyId" = $1
           AND a.status NOT IN ('CANCELLED','ARRIVED') AND b.status NOT IN ('CANCELLED','ARRIVED')
           AND (a."departureTime", a."estimatedArrivalTime") OVERLAPS (b."departureTime", b."estimatedArrivalTime")
         LIMIT 100`,
        [companyId],
      );
    const [busConflicts, driverConflicts] = await Promise.all([conflict('busId'), conflict('driverId')]);
    return { busConflicts, driverConflicts, total: busConflicts.length + driverConflicts.length };
  }

  /**
   * Fleet profit/loss: for each bus, revenue (confirmed bookings on its trips)
   * minus expenses (driver refuel/expense reports), so an owner sees which bus
   * earns and which loses money.
   */
  async getFleetReport(companyId: string) {
    const buses = await this.busRepo.find({ where: { companyId } });
    const trips = await this.tripRepo.find({ where: { companyId } });

    const revenueByTrip = await this.bookingService.getRevenueByTrips(trips.map((t) => t.id));

    // Expenses per bus (denormalised busId on reports).
    const expenseRows = await this.reportRepo
      .createQueryBuilder('r')
      .select('r.busId', 'busId')
      .addSelect('COALESCE(SUM(r.amount), 0)', 'expenses')
      .where('r.companyId = :companyId', { companyId })
      .groupBy('r.busId')
      .getRawMany();
    const expenseByBus = Object.fromEntries(expenseRows.map((r) => [r.busId, Number(r.expenses)]));

    // Revenue + trip count per bus.
    const revenueByBus: Record<string, number> = {};
    const tripsByBus: Record<string, number> = {};
    for (const t of trips) {
      revenueByBus[t.busId] = (revenueByBus[t.busId] ?? 0) + (revenueByTrip[t.id] ?? 0);
      tripsByBus[t.busId] = (tripsByBus[t.busId] ?? 0) + 1;
    }

    const rows = buses.map((b) => {
      const revenue = Math.round(revenueByBus[b.id] ?? 0);
      const expenses = Math.round(expenseByBus[b.id] ?? 0);
      return {
        busId: b.id,
        registration: b.registrationNumber,
        busType: b.busType,
        make: `${b.make} ${b.model}`,
        trips: tripsByBus[b.id] ?? 0,
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });
    rows.sort((a, b) => b.profit - a.profit);

    const totals = rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        expenses: acc.expenses + r.expenses,
        profit: acc.profit + r.profit,
      }),
      { revenue: 0, expenses: 0, profit: 0 },
    );

    return {
      buses: rows.length,
      totals,
      bestPerformer: rows[0] ?? null,
      worstPerformer: rows.length ? rows[rows.length - 1] : null,
      fleet: rows,
    };
  }
}
