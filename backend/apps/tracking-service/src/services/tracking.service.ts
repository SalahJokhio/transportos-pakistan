import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsLog } from '../entities/gps-log.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(GpsLog) private readonly gpsRepo: Repository<GpsLog>,
  ) {}

  /** Persist a single GPS ping for history / replay / analytics. */
  async record(tripId: string, lat: number, lng: number, speed?: number, heading?: number): Promise<void> {
    await this.gpsRepo.save(this.gpsRepo.create({ tripId, lat, lng, speed, heading }));
  }

  /** Full GPS trail for a trip, oldest → newest (for map replay). */
  async getHistory(tripId: string, limit = 500) {
    const points = await this.gpsRepo.find({
      where: { tripId },
      order: { recordedAt: 'ASC' },
      take: limit,
    });
    return { tripId, points: points.length, trail: points };
  }
}
