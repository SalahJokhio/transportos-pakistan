import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { Bus } from '../entities/bus.entity';
import { CreateTripDto, SearchTripsDto } from '../dto/fleet.dto';
import { TripStatus, TransportType } from '@app/common';
import { EventBusService } from '../../../automation-service/src/services/event-bus.service';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    private readonly eventBus: EventBusService,
  ) {}

  /** Emit a trip lifecycle event (best-effort); DELAYED gets its own type. */
  private async emitTripEvent(trip: Trip, previous?: TripStatus) {
    try {
      const payload = {
        tripId: trip.id,
        routeId: trip.routeId,
        busId: trip.busId,
        status: trip.status,
        previousStatus: previous ?? null,
        departureTime: trip.departureTime,
      };
      await this.eventBus.emit('TRIP_STATUS_CHANGED', payload, { companyId: trip.companyId, source: 'trip.status' });
      if (trip.status === TripStatus.DELAYED) {
        await this.eventBus.emit('TRIP_DELAYED', payload, { companyId: trip.companyId, source: 'trip.status' });
      }
    } catch { /* best-effort — never block the status change */ }
  }

  async create(dto: CreateTripDto, companyId: string): Promise<Trip> {
    const bus = await this.busRepo.findOne({ where: { id: dto.busId } });
    if (!bus) throw new NotFoundException('Bus not found');
    const route = await this.routeRepo.findOne({ where: { id: dto.routeId } });
    if (!route) throw new NotFoundException('Route not found');

    const departure = new Date(dto.departureTime);
    const arrival = new Date(departure.getTime() + route.estimatedMinutes * 60000);

    const seatAvailability: Record<string, 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'BLOCKED'> = {};
    bus.seatLayout.layout.forEach((seat: any) => {
      seatAvailability[seat.seatNumber] = 'AVAILABLE';
    });

    const trip = new Trip();
    trip.routeId = dto.routeId;
    trip.busId = dto.busId;
    trip.driverId = dto.driverId;
    trip.basePrice = dto.basePrice;
    trip.companyId = companyId;
    trip.departureTime = departure;
    trip.estimatedArrivalTime = arrival;
    trip.seatAvailability = seatAvailability;
    return this.tripRepo.save(trip);
  }

  async search(dto: SearchTripsDto & { transportType?: string }): Promise<any[]> {
    const date = new Date(dto.date);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    const passengers = Math.max(1, Number(dto.passengers) || 1);

    // Case-insensitive city match: users type "karachi" / "KARACHI" — exact
    // equality silently returned zero trips. ILIKE + trim keeps search forgiving.
    const routeQb = this.routeRepo
      .createQueryBuilder('route')
      .where('route.isActive = true')
      .andWhere('LOWER(TRIM(route.originCity)) = LOWER(TRIM(:origin))', { origin: dto.originCity })
      .andWhere('LOWER(TRIM(route.destinationCity)) = LOWER(TRIM(:dest))', { dest: dto.destinationCity });
    if (dto.transportType) {
      routeQb.andWhere('route.transportType = :tt', { tt: dto.transportType });
    }
    const routes = await routeQb.getMany();
    if (!routes.length) return [];

    const routeIds = routes.map(r => r.id);
    const trips = await this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.routeId IN (:...routeIds)', { routeIds })
      .andWhere('trip.departureTime BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .andWhere('trip.status IN (:...statuses)', { statuses: [TripStatus.SCHEDULED, TripStatus.BOARDING] })
      .orderBy('trip.departureTime', 'ASC') // earliest departure first
      .getMany();

    return trips
      .map(trip => {
        const available = Object.values(trip.seatAvailability).filter(s => s === 'AVAILABLE').length;
        const route = routes.find(r => r.id === trip.routeId);
        return { ...trip, availableSeats: available, route, transportType: route?.transportType ?? 'BUS' };
      })
      // Only show trips that can actually seat the whole group.
      .filter(t => t.availableSeats >= passengers);
  }

  async findById(id: string): Promise<any> {
    const trip = await this.tripRepo.findOne({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    // Attach the route (with boarding/drop points) so checkout can offer them.
    const route = await this.routeRepo.findOne({ where: { id: trip.routeId } });
    return {
      ...trip,
      route,
      boardingPoints: route?.boardingPoints ?? [],
      droppingPoints: route?.droppingPoints ?? [],
    };
  }

  async updateStatus(id: string, status: TripStatus): Promise<Trip> {
    const before = await this.tripRepo.findOne({ where: { id } });
    await this.tripRepo.update(id, { status });
    const trip = await this.findById(id);
    await this.emitTripEvent(trip, before?.status);
    return trip;
  }

  /** Assign / reassign a driver to a trip (only the trip's own company). */
  async assignDriver(tripId: string, driverId: string, companyId: string): Promise<Trip> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.companyId !== companyId) throw new ForbiddenException('This trip belongs to another operator');
    trip.driverId = driverId;
    return this.tripRepo.save(trip);
  }

  /**
   * Driver-driven trip lifecycle. Only the assigned driver can start/end their
   * own trip; we stamp the real departure/arrival time for analytics + ETA.
   */
  async driverUpdateStatus(tripId: string, driverId: string, action: 'start' | 'end'): Promise<Trip> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) throw new ForbiddenException('This trip is not assigned to you');

    if (action === 'start') {
      if ([TripStatus.ARRIVED, TripStatus.CANCELLED].includes(trip.status)) {
        throw new BadRequestException(`Cannot start a ${trip.status} trip`);
      }
      trip.status = TripStatus.DEPARTED;
      trip.actualDepartureTime = new Date();
    } else {
      if (trip.status === TripStatus.CANCELLED) throw new BadRequestException('Trip was cancelled');
      trip.status = TripStatus.ARRIVED;
      trip.actualArrivalTime = new Date();
    }
    const saved = await this.tripRepo.save(trip);
    await this.emitTripEvent(saved);
    return saved;
  }

  async getSeatMap(tripId: string) {
    const trip = await this.findById(tripId);
    return { tripId, seatAvailability: trip.seatAvailability };
  }
}
