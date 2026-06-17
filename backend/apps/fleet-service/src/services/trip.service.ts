import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { Bus } from '../entities/bus.entity';
import { CreateTripDto, SearchTripsDto } from '../dto/fleet.dto';
import { TripStatus, TransportType } from '@app/common';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
  ) {}

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

    const routeWhere: Record<string, any> = {
      originCity: dto.originCity,
      destinationCity: dto.destinationCity,
      isActive: true,
    };
    if (dto.transportType) routeWhere.transportType = dto.transportType;

    const routes = await this.routeRepo.find({ where: routeWhere });
    if (!routes.length) return [];

    const routeIds = routes.map(r => r.id);
    const trips = await this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.routeId IN (:...routeIds)', { routeIds })
      .andWhere('trip.departureTime BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .andWhere('trip.status IN (:...statuses)', { statuses: [TripStatus.SCHEDULED, TripStatus.BOARDING] })
      .getMany();

    return trips.map(trip => {
      const available = Object.values(trip.seatAvailability).filter(s => s === 'AVAILABLE').length;
      const route = routes.find(r => r.id === trip.routeId);
      return { ...trip, availableSeats: available, route, transportType: route?.transportType ?? 'BUS' };
    });
  }

  async findById(id: string): Promise<Trip> {
    const trip = await this.tripRepo.findOne({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async updateStatus(id: string, status: TripStatus): Promise<Trip> {
    await this.tripRepo.update(id, { status });
    return this.findById(id);
  }

  async getSeatMap(tripId: string) {
    const trip = await this.findById(tripId);
    return { tripId, seatAvailability: trip.seatAvailability };
  }
}
