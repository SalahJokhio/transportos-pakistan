import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { DriverReview } from '../entities/driver-review.entity';
import { User } from '../../../user-service/src/entities/user.entity';
import { TripStatus } from '@app/common';

@Injectable()
export class DriverRecordService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(DriverReview) private readonly reviewRepo: Repository<DriverReview>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** Full portable record for a driver — the CNIC-traceable "driver CV". */
  async getRecord(driverId: string) {
    const user = await this.userRepo.findOne({ where: { id: driverId } });
    if (!user) throw new NotFoundException('Driver not found');

    const trips = await this.tripRepo.find({ where: { driverId } });
    const completed = trips.filter((t) => t.status === TripStatus.ARRIVED);

    // Routes actually driven (distinct) + total distance.
    const routeIds = [...new Set(completed.map((t) => t.routeId))];
    const routes = routeIds.length ? await this.routeRepo.find({ where: { id: In(routeIds) } }) : [];
    const totalKm = completed.reduce((sum, t) => {
      const r = routes.find((x) => x.id === t.routeId);
      return sum + Number(r?.distanceKm ?? 0);
    }, 0);

    // Reviews + average rating.
    const reviews = await this.reviewRepo.find({ where: { driverId }, order: { createdAt: 'DESC' } });
    const avgRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    const monthsActive = Math.max(
      0,
      Math.round((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );

    return {
      driverId,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      cnic: user.cnic ?? null,
      phone: user.phone,
      memberSince: user.createdAt,
      experienceMonths: monthsActive,
      isVerified: user.isPhoneVerified ?? false,
      stats: {
        totalTrips: trips.length,
        completedTrips: completed.length,
        routesDriven: routes.map((r) => `${r.originCity} → ${r.destinationCity}`),
        totalKm: Math.round(totalKm),
      },
      rating: { average: avgRating, count: reviews.length },
      recentReviews: reviews.slice(0, 10).map((r) => ({
        by: r.byName ?? 'Anonymous',
        rating: r.rating,
        remark: r.remark,
        at: r.createdAt,
      })),
    };
  }

  /** Lightweight list of all drivers (for assignment) with rating + trip count. */
  async listDrivers() {
    const drivers = await this.userRepo.find({
      where: { role: 'DRIVER' as any },
      order: { firstName: 'ASC' },
    });
    return Promise.all(
      drivers.map(async (d) => {
        const [tripCount, reviews] = await Promise.all([
          this.tripRepo.count({ where: { driverId: d.id, status: TripStatus.ARRIVED } }),
          this.reviewRepo.find({ where: { driverId: d.id } }),
        ]);
        const avg = reviews.length
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : null;
        return {
          id: d.id,
          name: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || 'Driver',
          phone: d.phone,
          cnic: d.cnic ?? null,
          completedTrips: tripCount,
          rating: avg,
          reviews: reviews.length,
        };
      }),
    );
  }

  /** Company-side verification: look a driver up by CNIC and return their record. */
  async verifyByCnic(cnic: string) {
    const user = await this.userRepo.findOne({ where: { cnic } });
    if (!user) throw new NotFoundException('No driver found for this CNIC');
    return this.getRecord(user.id);
  }

  /** Leave a rating/remark on a driver (portable — stays on their record). */
  async addReview(
    driverId: string,
    dto: { rating: number; remark?: string; byUserId?: string; byName?: string; tripId?: string },
  ) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    const rating = Number(dto.rating);
    if (!rating || rating < 1 || rating > 5) throw new BadRequestException('Rating must be 1–5');

    const review = this.reviewRepo.create({
      driverId,
      byUserId: dto.byUserId ?? null,
      byName: dto.byName ?? null,
      rating,
      remark: dto.remark ?? null,
      tripId: dto.tripId ?? null,
    });
    await this.reviewRepo.save(review);
    return { ok: true, review: { rating, remark: dto.remark ?? null } };
  }
}
