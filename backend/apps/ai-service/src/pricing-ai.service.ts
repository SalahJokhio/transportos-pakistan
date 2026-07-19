import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../../fleet-service/src/entities/trip.entity';

interface PriceFactor { name: string; delta: number; note: string }

/**
 * Demand-based dynamic pricing (yield management). Deterministic and auditable —
 * exactly how airlines/buses price seats — driven by seat occupancy, how close
 * departure is, and the departure slot. Returns a suggested multiplier + price
 * that an operator can accept or ignore; it never changes a fare on its own.
 */
@Injectable()
export class PricingAiService {
  constructor(@InjectRepository(Trip) private readonly tripRepo: Repository<Trip>) {}

  async suggestForTrip(tripId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const seatMap = (trip.seatAvailability as Record<string, string>) || {};
    const totalFromMap = Object.keys(seatMap).length;
    const bookedRows: Array<{ n: string }> = await this.tripRepo.query(
      `SELECT COUNT(*)::text AS n FROM booking_seats WHERE "tripId" = $1 AND status = 'CONFIRMED'`,
      [tripId],
    );
    const booked = Number(bookedRows?.[0]?.n ?? 0);
    const totalSeats = totalFromMap > 0 ? totalFromMap : 40;
    const occupancy = totalSeats > 0 ? booked / totalSeats : 0;

    const departure = trip.departureTime ? new Date(trip.departureTime) : new Date();
    const daysToDeparture = Math.max(0, (departure.getTime() - Date.now()) / 86_400_000);
    const hour = departure.getHours();
    const dow = departure.getDay(); // 0 Sun … 6 Sat

    const factors: PriceFactor[] = [];
    const add = (name: string, delta: number, note: string) => { if (delta !== 0) factors.push({ name, delta, note }); };

    // Occupancy: fuller bus → higher price; nearly empty → discount to fill.
    if (occupancy >= 0.8) add('High occupancy', 0.25, `${Math.round(occupancy * 100)}% full`);
    else if (occupancy >= 0.6) add('Good occupancy', 0.15, `${Math.round(occupancy * 100)}% full`);
    else if (occupancy >= 0.4) add('Moderate occupancy', 0.05, `${Math.round(occupancy * 100)}% full`);
    else if (occupancy < 0.2) add('Low occupancy', -0.1, 'discount to fill seats');

    // Lead time: last-minute premium, early-bird discount.
    if (daysToDeparture < 1) add('Last-minute', 0.15, 'departs within 24h');
    else if (daysToDeparture <= 3) add('Near-term', 0.05, 'departs within 3 days');
    else if (daysToDeparture > 14) add('Early bird', -0.05, 'more than 2 weeks out');

    // Peak departure slots (morning/evening rush) + weekend travel.
    if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) add('Peak slot', 0.05, 'rush-hour departure');
    if (dow === 5 || dow === 0) add('Weekend', 0.05, 'Fri/Sun travel');

    const raw = 1 + factors.reduce((s, f) => s + f.delta, 0);
    const multiplier = Math.min(1.6, Math.max(0.8, Number(raw.toFixed(2))));
    const basePrice = Number(trip.basePrice) || 0;
    const suggestedPrice = Math.round((basePrice * multiplier) / 10) * 10;

    return {
      tripId,
      basePrice,
      occupancy: Number(occupancy.toFixed(2)),
      booked,
      totalSeats,
      daysToDeparture: Number(daysToDeparture.toFixed(1)),
      suggestedMultiplier: multiplier,
      suggestedPrice,
      factors,
      reason: factors.length ? factors.map((f) => f.name).join(', ') : 'Normal demand',
    };
  }
}
