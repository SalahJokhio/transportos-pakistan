import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';

/**
 * Dispatcher Console (Design Bible Book 3): a live operations board fusing
 * today's trips, their status/occupancy, unassigned/delayed flags, and the
 * live SOS + decision alert feed — all from data the platform already holds.
 */
@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
  ) {}

  async board(companyId?: string) {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

    const where: any = { departureTime: Between(dayStart, dayEnd) };
    if (companyId) where.companyId = companyId;
    const trips = await this.tripRepo.find({ where, order: { departureTime: 'ASC' }, take: 200 });

    const [routes, buses] = await Promise.all([this.routeRepo.find(), this.busRepo.find()]);
    const routeName = (id: string) => { const r = routes.find((x) => x.id === id); return r ? `${r.originCity}→${r.destinationCity}` : 'route'; };
    const busReg = (id: string) => buses.find((b) => b.id === id)?.registrationNumber ?? id;

    const rows = trips.map((t) => {
      const seats = Object.values(t.seatAvailability || {});
      const total = seats.length || 1;
      const booked = seats.filter((s) => s === 'BOOKED').length;
      return {
        tripId: t.id, route: routeName(t.routeId), bus: busReg(t.busId),
        driverId: t.driverId, unassigned: !t.driverId || t.driverId === 'unassigned',
        status: t.status, departureTime: t.departureTime,
        occupancy: Math.round((booked / total) * 100), booked, total,
        delayMinutes: (t as any).delayMinutes ?? 0,
      };
    });

    // Live alert feed (SOS + dispatch decisions + agent flags).
    const alerts = await this.alertRepo.find({
      where: companyId ? [{ companyId }] : undefined,
      order: { createdAt: 'DESC' }, take: 20,
    });
    const critical = alerts.filter((a) => a.severity === 'critical');

    const summary = {
      total: rows.length,
      enRoute: rows.filter((r) => ['DEPARTED', 'IN_TRANSIT', 'BOARDING'].includes(r.status)).length,
      unassigned: rows.filter((r) => r.unassigned).length,
      delayed: rows.filter((r) => r.status === 'DELAYED' || r.delayMinutes > 0).length,
      criticalAlerts: critical.length,
    };
    return { summary, trips: rows, alerts: alerts.map((a) => ({ id: a.id, severity: a.severity, title: a.title, message: a.message, createdAt: a.createdAt, source: a.meta?.source })) };
  }
}
