import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { Booking } from '../entities/booking.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    private readonly configService: ConfigService,
  ) {}

  // Short tamper-proof signature over the ticket identity. A conductor's
  // scanner recomputes this from the PNR+bookingId and rejects forgeries.
  private sign(pnr: string, bookingId: string): string {
    const secret = this.configService.get<string>('JWT_SECRET', 'transport-os-secret');
    return crypto.createHmac('sha256', secret).update(`${pnr}:${bookingId}`).digest('hex').slice(0, 16);
  }

  /** Full e-ticket: booking + trip/route/bus details + a scannable QR. */
  async getTicket(pnr: string) {
    const booking = await this.bookingRepo.findOne({ where: { pnr } });
    if (!booking) throw new NotFoundException('Booking not found');

    const trip = await this.tripRepo.findOne({ where: { id: booking.tripId } });
    const route = trip ? await this.routeRepo.findOne({ where: { id: trip.routeId } }) : null;
    const bus = trip ? await this.busRepo.findOne({ where: { id: trip.busId } }) : null;

    const sig = this.sign(booking.pnr, booking.id);
    // QR encodes the verify payload — scanning hits GET /bookings/verify/:pnr?sig=…
    const qrPayload = JSON.stringify({ pnr: booking.pnr, sig, seats: booking.seatNumbers });
    const qrCode = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

    return {
      pnr: booking.pnr,
      tripId: booking.tripId,
      status: booking.status,
      seatNumbers: booking.seatNumbers,
      passengerDetails: booking.passengerDetails,
      finalAmount: booking.finalAmount,
      createdAt: booking.createdAt,
      qrCode, // data:image/png;base64,…  — render directly in <img src>
      trip: trip && {
        driverId: trip.driverId,
        departureTime: trip.departureTime,
        estimatedArrivalTime: trip.estimatedArrivalTime,
        status: trip.status,
      },
      route: route && {
        name: route.name,
        originCity: route.originCity,
        destinationCity: route.destinationCity,
      },
      bus: bus && {
        registrationNumber: bus.registrationNumber,
        busType: bus.busType,
        make: bus.make,
        model: bus.model,
      },
    };
  }

  /** Conductor-side check: is this PNR + signature genuine and boardable? */
  async verify(pnr: string, sig: string) {
    const booking = await this.bookingRepo.findOne({ where: { pnr } });
    if (!booking) return { valid: false, reason: 'PNR not found' };

    const expected = this.sign(booking.pnr, booking.id);
    if (sig !== expected) return { valid: false, reason: 'Signature mismatch — possible forgery' };

    const boardable = booking.status === 'CONFIRMED';
    return {
      valid: boardable,
      reason: boardable ? 'OK' : `Not boardable (status: ${booking.status})`,
      pnr: booking.pnr,
      status: booking.status,
      seatNumbers: booking.seatNumbers,
      boardedAt: booking.boardedAt,
    };
  }

  /**
   * Conductor scans the QR at boarding: verify the signature, then stamp the
   * booking as boarded (idempotent — a re-scan just returns "already boarded").
   */
  async board(pnr: string, sig: string) {
    const check = await this.verify(pnr, sig);
    if (!check.valid) return { boarded: false, ...check };
    const booking = await this.bookingRepo.findOne({ where: { pnr } });
    if (booking.boardedAt) return { boarded: true, alreadyBoarded: true, pnr, seatNumbers: booking.seatNumbers, boardedAt: booking.boardedAt };
    const boardedAt = new Date();
    await this.bookingRepo.update(booking.id, { boardedAt });
    return { boarded: true, pnr, seatNumbers: booking.seatNumbers, boardedAt };
  }
}
