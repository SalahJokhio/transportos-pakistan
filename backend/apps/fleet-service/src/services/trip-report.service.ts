import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripReport } from '../entities/trip-report.entity';
import { Trip } from '../entities/trip.entity';

interface CreateReportDto {
  type: string; // INCIDENT | REFUEL | EXPENSE | NOTE
  category?: string;
  description?: string;
  amount?: number;
  litres?: number;
  mediaUrls?: string[];
  lat?: number;
  lng?: number;
}

@Injectable()
export class TripReportService {
  constructor(
    @InjectRepository(TripReport) private readonly reportRepo: Repository<TripReport>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
  ) {}

  /** A driver files a report against a trip they are assigned to. */
  async create(tripId: string, driverId: string, dto: CreateReportDto) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) throw new ForbiddenException('This trip is not assigned to you');

    const report = this.reportRepo.create({
      tripId,
      driverId,
      busId: trip.busId,
      companyId: trip.companyId,
      type: dto.type,
      category: dto.category ?? null,
      description: dto.description ?? null,
      amount: dto.amount ?? 0,
      litres: dto.litres ?? null,
      mediaUrls: dto.mediaUrls ?? [],
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
    });
    return this.reportRepo.save(report);
  }

  /** Driver's own reports for a trip. */
  listForDriver(tripId: string, driverId: string) {
    return this.reportRepo.find({ where: { tripId, driverId }, order: { createdAt: 'DESC' } });
  }

  /** Owner feed: recent reports across the whole company's fleet. */
  async listForCompany(companyId: string, limit = 50) {
    const reports = await this.reportRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    const totalSpent = reports.reduce((s, r) => s + Number(r.amount || 0), 0);
    const incidents = reports.filter((r) => r.type === 'INCIDENT').length;
    return { count: reports.length, incidents, totalSpent, reports };
  }

  /** Owner/operator view — ownership-checked against the trip's company. */
  async listForOperator(tripId: string, companyId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.companyId !== companyId) throw new ForbiddenException('This trip belongs to another operator');
    const reports = await this.reportRepo.find({ where: { tripId }, order: { createdAt: 'DESC' } });
    const totalSpent = reports.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { tripId, count: reports.length, totalSpent, reports };
  }
}
