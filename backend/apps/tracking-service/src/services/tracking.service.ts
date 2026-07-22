import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsLog } from '../entities/gps-log.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(GpsLog) private readonly gpsRepo: Repository<GpsLog>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
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

  /**
   * Latest position of every bus that pinged in the last 30 minutes — powers
   * the live ops map. DISTINCT ON keeps only the newest row per trip.
   */
  async getLiveMap() {
    const buses = await this.gpsRepo.query(`
      SELECT DISTINCT ON ("tripId") "tripId", lat, lng, speed, heading, "recordedAt"
      FROM gps_logs
      WHERE "recordedAt" >= now() - interval '30 minutes'
      ORDER BY "tripId", "recordedAt" DESC
    `);
    return { count: buses.length, buses };
  }

  /**
   * Delay-adjusted ETA + trip progress. Uses the schedule (departure/estimated
   * arrival) plus the recorded delay; progress is elapsed vs. scheduled duration.
   */
  async getEta(tripId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) return { tripId, message: 'Trip not found' };

    const dep = trip.departureTime ? new Date(trip.departureTime) : null;
    const arr = trip.estimatedArrivalTime ? new Date(trip.estimatedArrivalTime) : null;
    const delay = trip.delayMinutes || 0;
    const eta = arr ? new Date(arr.getTime() + delay * 60_000) : null;

    let progressPct: number | null = null;
    if (dep && arr) {
      const total = arr.getTime() - dep.getTime();
      const elapsed = Date.now() - dep.getTime();
      progressPct = total > 0 ? Math.round(Math.max(0, Math.min(1, elapsed / total)) * 100) : null;
    }
    const arriving = progressPct != null && progressPct >= 90;
    return { tripId, status: trip.status, scheduledArrival: arr, delayMinutes: delay, eta, progressPct, arriving };
  }
}
