import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { EventBusService } from '../services/event-bus.service';

/**
 * AI Decision Engine (blueprint line 670). Turns a signal (a delayed trip) into
 * a coordinated recommendation: who's affected, and which idle vehicle could
 * cover it — then records the decision + notifies. Advisory (human confirms).
 */
@Injectable()
export class DecisionService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    private readonly eventBus: EventBusService,
  ) {}

  /** Given a delayed (or at-risk) trip, produce and record a dispatch decision. */
  async handleDelay(tripId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    const route = await this.routeRepo.findOne({ where: { id: trip.routeId } });
    const routeName = route ? `${route.originCity}→${route.destinationCity}` : 'route';

    // Affected passengers: confirmed bookings on this trip.
    const bookings = await this.bookingRepo.find({ where: { tripId, status: 'CONFIRMED' as any } });
    const seats = bookings.reduce((n, b) => n + (b.seatNumbers?.length || 0), 0);

    // Alternative vehicle: an active bus of the same company with no trip
    // departing within ±3h of this departure.
    const dep = new Date(trip.departureTime);
    const windowStart = new Date(dep.getTime() - 3 * 3600_000);
    const windowEnd = new Date(dep.getTime() + 3 * 3600_000);
    const buses = await this.busRepo.find({ where: { companyId: trip.companyId, isActive: true } });
    let alternative: Bus | null = null;
    for (const bus of buses) {
      if (bus.id === trip.busId) continue;
      const clash = await this.tripRepo.count({ where: { busId: bus.id, departureTime: Between(windowStart, windowEnd) } });
      if (clash === 0) { alternative = bus; break; }
    }

    const decision = {
      tripId, route: routeName,
      departure: trip.departureTime,
      delayMinutes: (trip as any).delayMinutes ?? null,
      affectedPassengers: bookings.length,
      affectedSeats: seats,
      suggestedAlternative: alternative ? { busId: alternative.id, registration: alternative.registrationNumber, seats: alternative.totalSeats } : null,
      recommendation: alternative
        ? `Reassign ${routeName} to ${alternative.registrationNumber} (${alternative.totalSeats} seats). Notify ${bookings.length} passenger(s).`
        : `No idle bus available near this slot — notify ${bookings.length} passenger(s) of the delay and hold for the current vehicle.`,
    };

    // Record + surface the decision.
    await this.alertRepo.save(this.alertRepo.create({
      companyId: trip.companyId, severity: 'warning',
      title: `Dispatch decision: ${routeName} delayed`,
      message: decision.recommendation,
      meta: { source: 'decision', tripId, alternative: decision.suggestedAlternative },
    }));
    this.eventBus.emit('DISPATCH_DECISION', decision, { companyId: trip.companyId, source: 'decision' }).catch(() => undefined);

    return decision;
  }
}
