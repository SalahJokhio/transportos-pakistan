import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { Bus } from '../entities/bus.entity';

const DAYS_AHEAD = 7;

/** Recurring trip templates → auto-generated Trip rows for the coming week. */
@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule) private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
  ) {}

  create(companyId: string, dto: Partial<Schedule>) {
    return this.scheduleRepo.save(this.scheduleRepo.create({ ...dto, companyId }));
  }
  list(companyId: string) {
    return this.scheduleRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }
  async remove(id: string, companyId: string) {
    await this.scheduleRepo.delete({ id, companyId });
    return { deleted: true };
  }

  /** Materialize trips from one schedule for the next DAYS_AHEAD days. */
  private async generateForSchedule(s: Schedule): Promise<number> {
    const [bus, route] = await Promise.all([
      this.busRepo.findOne({ where: { id: s.busId } }),
      this.routeRepo.findOne({ where: { id: s.routeId } }),
    ]);
    if (!bus || !route) return 0;

    const [hh, mm] = String(s.departureTime).split(':').map(Number);
    let created = 0;
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const day = new Date();
      day.setDate(day.getDate() + d);
      if (!(s.daysOfWeek || []).includes(day.getDay())) continue;

      const departure = new Date(day);
      departure.setHours(hh || 0, mm || 0, 0, 0);
      if (departure.getTime() < Date.now()) continue; // don't create past trips

      // Dedup: same bus + exact departure already scheduled.
      const exists = await this.tripRepo.findOne({ where: { busId: s.busId, departureTime: departure } });
      if (exists) continue;

      const seatAvailability: Record<string, string> = {};
      (bus.seatLayout?.layout ?? []).forEach((seat: any) => (seatAvailability[seat.seatNumber] = 'AVAILABLE'));

      await this.tripRepo.save(
        this.tripRepo.create({
          routeId: s.routeId,
          busId: s.busId,
          driverId: s.driverId || 'unassigned', // trips.driverId is NOT NULL
          companyId: s.companyId,
          basePrice: s.basePrice,
          departureTime: departure,
          estimatedArrivalTime: new Date(departure.getTime() + route.estimatedMinutes * 60000),
          seatAvailability: seatAvailability as any,
        }),
      );
      created++;
    }
    return created;
  }

  /** On-demand generation for one operator's schedules. */
  async generate(companyId: string) {
    const schedules = await this.scheduleRepo.find({ where: { companyId, isActive: true } });
    let created = 0;
    for (const s of schedules) created += await this.generateForSchedule(s);
    return { schedules: schedules.length, tripsCreated: created };
  }

  /** Nightly: roll all active schedules forward so trips always exist a week out. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateAll() {
    const schedules = await this.scheduleRepo.find({ where: { isActive: true } });
    let created = 0;
    for (const s of schedules) {
      try { created += await this.generateForSchedule(s); } catch (e: any) { this.logger.warn(`schedule ${s.id}: ${e.message}`); }
    }
    if (created) this.logger.log(`Schedule cron generated ${created} trip(s)`);
  }
}
