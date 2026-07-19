import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, DataSource, QueryFailedError, In, LessThan } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingSeat } from '../entities/booking-seat.entity';
import { CreateBookingDto, CancelBookingDto } from '../dto/booking.dto';
import { CouponService } from './coupon.service';
import { BookingStatus, PaymentStatus, StringUtil } from '@app/common';
import { Payment } from '../../../payment-service/src/entities/payment.entity';
import { SeatLockService } from './seat-lock.service';
import { PricingService } from './pricing.service';
import { User } from '../../../user-service/src/entities/user.entity';
import { LoyaltyTransaction, LoyaltyTransactionType } from '../../../user-service/src/entities/loyalty-transaction.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { NotificationService } from '../../../notification-service/src/notification.service';

// 1 loyalty point per Rs 10 spent
const POINTS_PER_RUPEE = 1 / 10;
const UNIQUE_VIOLATION = '23505';
// Agents earn 5% of the fare on every walk-in ticket they issue.
const AGENT_COMMISSION_RATE = 0.05;

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingSeat) private readonly bookingSeatRepo: Repository<BookingSeat>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(LoyaltyTransaction) private readonly loyaltyRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    private readonly seatLockService: SeatLockService,
    private readonly pricingService: PricingService,
    private readonly couponService: CouponService,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  // Fire-and-forget SMS — never let a notification failure break the booking.
  private async notifyConfirmed(booking: Booking) {
    try {
      const user = await this.userRepo.findOne({ where: { id: booking.passengerId } });
      if (!user?.phone) return;
      const trip = await this.tripRepo.findOne({ where: { id: booking.tripId } });
      const route = trip ? await this.routeRepo.findOne({ where: { id: trip.routeId } }) : null;
      const routeStr = route ? `${route.originCity} → ${route.destinationCity}` : 'your trip';
      const departure = trip ? new Date(trip.departureTime).toLocaleString('en-PK') : '';
      await this.notificationService.sendBookingConfirmation(user.phone, booking.pnr, routeStr, departure);
    } catch (err: any) {
      this.logger.warn(`Confirmation SMS failed for ${booking.pnr}: ${err.message}`);
    }
  }

  private async notifyCancelled(booking: Booking) {
    try {
      const user = await this.userRepo.findOne({ where: { id: booking.passengerId } });
      if (user?.phone) await this.notificationService.sendCancellationNotice(user.phone, booking.pnr);
    } catch (err: any) {
      this.logger.warn(`Cancellation SMS failed for ${booking.pnr}: ${err.message}`);
    }
  }

  async create(dto: CreateBookingDto, passengerId: string, bookedById?: string): Promise<Booking> {
    // Self-service: the passenger holds the lock under their own id.
    return this.createBooking(dto, { passengerId, bookedById, lockHolderId: passengerId });
  }

  /**
   * Agent counter sale: the agent holds the seat lock and books on behalf of a
   * walk-in customer. bookedById is the agent; passengerId is the customer's
   * account if their phone is known, otherwise the agent acts as custodian.
   */
  async createByAgent(
    dto: CreateBookingDto & { customerPhone?: string },
    agentId: string,
  ): Promise<Booking> {
    let passengerId = agentId;
    if (dto.customerPhone) {
      const customer = await this.userRepo.findOne({ where: { phone: dto.customerPhone } });
      if (customer) passengerId = customer.id;
    }
    return this.createBooking(dto, { passengerId, bookedById: agentId, lockHolderId: agentId });
  }

  // Shared booking core. `lockHolderId` is whoever placed the Redis hold
  // (the passenger for self-service, the agent for counter sales).
  private async createBooking(
    dto: CreateBookingDto,
    opts: { passengerId: string; bookedById?: string; lockHolderId: string },
  ): Promise<Booking> {
    const { passengerId, bookedById, lockHolderId } = opts;

    // Idempotency: a retried/double-tapped checkout with the same key returns
    // the original booking instead of creating (and charging for) a second one.
    if (dto.idempotencyKey) {
      const dupe = await this.bookingRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
      if (dupe) return dupe;
    }

    const trip = await this.tripRepo.findOne({ where: { id: dto.tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    // Layer 1 (contention): caller must hold the Redis lock for every seat.
    const holdsLock = await this.seatLockService.holdsAll(dto.tripId, dto.seatNumbers, lockHolderId);
    if (!holdsLock) {
      throw new ConflictException('Seat hold expired or taken — please re-select your seats');
    }

    // Reject seats already sold (defence-in-depth alongside the DB constraint).
    const alreadyBooked = dto.seatNumbers.filter((s) => trip.seatAvailability?.[s] === 'BOOKED');
    if (alreadyBooked.length) {
      throw new ConflictException(`Seats already booked: ${alreadyBooked.join(', ')}`);
    }

    // Gender-seating rule: nobody may take the pair-seat next to a confirmed
    // passenger of the opposite gender.
    const seatGender: Record<string, string> = {};
    for (const p of dto.passengerDetails || []) {
      if (p?.seatNumber && (p.gender === 'M' || p.gender === 'F')) seatGender[p.seatNumber] = p.gender;
    }
    if (Object.keys(seatGender).length) {
      await this.enforceGenderSeating(dto.tripId, trip.busId, seatGender);
    }

    const price = this.pricingService.calculate(Number(trip.basePrice), dto.seatNumbers.length);
    const pnr = StringUtil.generateReference('TOS');

    // Apply a promo code on top of any base discount (validated server-side
    // against the real subtotal — the client can't inflate the discount).
    let discountAmount = Number(price.discount);
    let finalAmount = Number(price.total);
    let appliedCoupon: string | undefined;
    if (dto.promoCode) {
      const res = await this.couponService.validate(dto.promoCode, Number(price.subtotal));
      if (res.valid && res.discount > 0) {
        discountAmount += res.discount;
        finalAmount = Math.max(0, finalAmount - res.discount);
        appliedCoupon = res.code;
      }
    }

    const saved = await this.dataSource.transaction(async (em) => {
      const booking = em.create(Booking, {
        pnr,
        idempotencyKey: dto.idempotencyKey,
        tripId: dto.tripId,
        passengerId,
        bookedById,
        seatNumbers: dto.seatNumbers,
        passengerDetails: dto.passengerDetails,
        totalAmount: price.subtotal,
        discountAmount,
        finalAmount,
        status: BookingStatus.PENDING_PAYMENT,
      });
      const created = await em.save(Booking, booking);

      // One HELD seat row per seat. HELD rows are not covered by the partial
      // unique index, so concurrent bookings can co-exist until one confirms.
      const seatRows = dto.seatNumbers.map((seatNumber) =>
        em.create(BookingSeat, {
          tripId: dto.tripId,
          seatNumber,
          bookingId: created.id,
          passengerId,
          gender: seatGender[seatNumber] ?? null,
          status: 'HELD' as const,
        }),
      );
      await em.save(BookingSeat, seatRows);
      return created;
    });

    // Count the redemption once the booking exists (best-effort).
    if (appliedCoupon) await this.couponService.redeem(appliedCoupon).catch(() => undefined);
    return saved;
  }

  /** Neighbour column within a 2-seat block: (1,2) and (3,4) are pairs. */
  private pairCol(col: number): number {
    return col % 2 === 1 ? col + 1 : col - 1;
  }

  /**
   * Enforce Bookkaru-style gender seating: a passenger cannot occupy the seat
   * paired (same row, across no aisle) with a CONFIRMED passenger of the
   * opposite gender. Needs the bus geometry to know which seats are neighbours.
   */
  private async enforceGenderSeating(
    tripId: string,
    busId: string,
    requested: Record<string, string>,
  ): Promise<void> {
    const bus = await this.busRepo.findOne({ where: { id: busId } });
    const layout = bus?.seatLayout?.layout as
      | Array<{ seatNumber: string; row: number; col: number }>
      | undefined;
    if (!layout?.length) return; // no geometry → can't reason about adjacency

    const pos = new Map<string, { row: number; col: number }>();
    const byRowCol = new Map<string, string>();
    for (const s of layout) {
      pos.set(s.seatNumber, { row: s.row, col: s.col });
      byRowCol.set(`${s.row}:${s.col}`, s.seatNumber);
    }

    const confirmed = await this.bookingSeatRepo.find({ where: { tripId, status: 'CONFIRMED' } });
    const occupiedGender = new Map<string, string>();
    for (const c of confirmed) if (c.gender) occupiedGender.set(c.seatNumber, c.gender);

    for (const [seat, g] of Object.entries(requested)) {
      const p = pos.get(seat);
      if (!p) continue;
      const neighbour = byRowCol.get(`${p.row}:${this.pairCol(p.col)}`);
      if (!neighbour) continue; // single seat — no pair
      const ng = occupiedGender.get(neighbour);
      if (ng && ng !== g) {
        throw new ConflictException(
          `Seat ${seat} is next to a ${ng === 'F' ? 'female' : 'male'} passenger — please pick another seat`,
        );
      }
    }
  }

  async findByPnr(pnr: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { pnr } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /**
   * Geofenced arrival alert: SMS every confirmed passenger on a trip that the
   * bus is arriving. The geofence trigger fires from the driver app when it
   * nears the destination; this fans the notice out to passengers.
   */
  async notifyArrival(tripId: string): Promise<{ tripId: string; notified: number }> {
    const bookings = await this.bookingRepo.find({ where: { tripId, status: BookingStatus.CONFIRMED } });
    let notified = 0;
    for (const b of bookings) {
      const user = await this.userRepo.findOne({ where: { id: b.passengerId } });
      if (user?.phone) {
        this.notificationService
          .sendSms({ phone: user.phone, message: `TransportOS: Your bus (PNR ${b.pnr}) is arriving soon. Please be ready.` })
          .catch(() => undefined);
        notified++;
      }
    }
    return { tripId, notified };
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return this.bookingRepo.find({ where: { passengerId: userId }, order: { createdAt: 'DESC' } });
  }

  /**
   * Auto-expire abandoned checkouts: a booking left in PENDING_PAYMENT for >15
   * minutes is cancelled and its seat holds released, so a user who never paid
   * can't keep seats locked out of inventory. Runs every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleBookings() {
    const cutoff = new Date(Date.now() - 15 * 60_000);
    const stale = await this.bookingRepo.find({
      where: { status: BookingStatus.PENDING_PAYMENT, createdAt: LessThan(cutoff) },
      take: 200,
    });
    if (!stale.length) return;
    for (const b of stale) {
      await this.bookingRepo.update(b.id, {
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Payment not completed (auto-expired)',
        cancelledAt: new Date(),
      });
      await this.seatLockService.release(b.tripId, b.seatNumbers).catch(() => undefined);
    }
    this.logger.log(`Expired ${stale.length} stale PENDING_PAYMENT booking(s)`);
  }

  async cancel(id: string, dto: CancelBookingDto, userId: string): Promise<Booking> {
    const booking = await this.findById(id);
    if (booking.passengerId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Already cancelled');
    if (booking.status === BookingStatus.COMPLETED) throw new BadRequestException('Cannot cancel completed booking');

    let refund: { percent: number; amount: number; reason: string } | null = null;

    await this.dataSource.transaction(async (em) => {
      // Mark booking cancelled
      await em.update(Booking, id, {
        status: BookingStatus.CANCELLED,
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
      });

      // Free the seats: flipping rows out of CONFIRMED releases the partial
      // unique index so the seats become re-bookable immediately.
      await em.update(BookingSeat, { bookingId: id }, { status: 'CANCELLED' });

      // Release seats back to AVAILABLE on the trip
      const trip = await em.findOne(Trip, { where: { id: booking.tripId } });
      if (trip) {
        const updated = { ...trip.seatAvailability };
        booking.seatNumbers.forEach((seat) => {
          if (updated[seat] === 'BOOKED') updated[seat] = 'AVAILABLE';
        });
        await em.update(Trip, booking.tripId, { seatAvailability: updated });
      }

      // Refund the money: find the settled payment and reverse it per the
      // cancellation policy (based on how close to departure we are).
      const payment = await em.findOne(Payment, {
        where: { bookingId: id, status: PaymentStatus.COMPLETED },
      });
      if (payment) {
        refund = this.computeRefund(Number(payment.amount), trip?.departureTime);
        await em.update(Payment, payment.id, {
          status: PaymentStatus.REFUNDED,
          refundedAmount: refund.amount,
        });
      }

      // Reverse loyalty points if they were earned on this booking
      const earnedTx = await em.findOne(LoyaltyTransaction, {
        where: { bookingId: id, type: LoyaltyTransactionType.EARN },
      });
      if (earnedTx && earnedTx.points > 0) {
        const user = await em.findOne(User, { where: { id: booking.passengerId } });
        const pointsToReverse = Math.min(earnedTx.points, user?.loyaltyPoints ?? 0);
        if (pointsToReverse > 0) {
          await em.decrement(User, { id: booking.passengerId }, 'loyaltyPoints', pointsToReverse);
          const updated = await em.findOne(User, { where: { id: booking.passengerId } });
          await em.save(LoyaltyTransaction, {
            userId: booking.passengerId,
            type: LoyaltyTransactionType.REFUND,
            points: -pointsToReverse,
            balanceAfter: updated?.loyaltyPoints ?? 0,
            bookingId: id,
            description: `Reversed ${pointsToReverse} pts — booking ${booking.pnr} cancelled`,
          });
        }
      }
    });

    // Notify the passenger their booking is cancelled (+ refund on the way).
    await this.notifyCancelled(booking);

    const result: any = await this.findById(id);
    result.refund = refund ?? { percent: 0, amount: 0, reason: 'No settled payment to refund' };
    return result;
  }

  /**
   * Cancellation refund policy, by time remaining to departure:
   *   ≥24h → 100% · 2–24h → 50% · <2h or departed → 0%.
   */
  private computeRefund(amount: number, departureTime?: Date) {
    if (!departureTime) return { percent: 100, amount: Math.round(amount), reason: 'Full refund' };
    const hoursToDeparture = (new Date(departureTime).getTime() - Date.now()) / 3_600_000;
    let percent: number;
    let reason: string;
    if (hoursToDeparture >= 24) { percent = 100; reason = 'Cancelled 24h+ before departure'; }
    else if (hoursToDeparture >= 2) { percent = 50; reason = 'Cancelled 2–24h before departure'; }
    else { percent = 0; reason = hoursToDeparture < 0 ? 'Trip already departed' : 'Cancelled under 2h before departure'; }
    return { percent, amount: Math.round((amount * percent) / 100), reason };
  }

  async confirm(id: string, paymentId: string): Promise<Booking> {
    const existing = await this.findById(id);
    // Idempotent: confirming an already-confirmed booking is a no-op (safe on
    // payment webhook retries).
    if (existing.status === BookingStatus.CONFIRMED) return existing;
    if (existing.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot confirm a cancelled booking');
    }

    // Layer 2 (correctness): flip this booking's seats to CONFIRMED inside a
    // transaction. The partial UNIQUE index (uq_confirmed_seat) makes the DB
    // itself reject the second confirmer of any seat — this is the real
    // double-booking guard, immune to Redis lying or lock expiry.
    try {
      await this.dataSource.transaction(async (em) => {
        await em.update(
          BookingSeat,
          { bookingId: id },
          { status: 'CONFIRMED' },
        );

        await em.update(Booking, id, {
          status: BookingStatus.CONFIRMED,
          paymentId,
        });

        const trip = await em.findOne(Trip, { where: { id: existing.tripId } });
        if (trip) {
          const updated = { ...trip.seatAvailability };
          existing.seatNumbers.forEach((seat) => { updated[seat] = 'BOOKED'; });
          await em.update(Trip, existing.tripId, { seatAvailability: updated });
        }
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'One or more seats were just booked by someone else. Payment will be refunded.',
        );
      }
      throw err;
    }

    // Locks are no longer needed once seats are durably booked.
    await this.seatLockService.release(existing.tripId, existing.seatNumbers).catch(() => undefined);

    const booking = await this.findById(id);

    // Auto-earn loyalty points: 1 pt per Rs 10
    const points = Math.floor((Number(booking.finalAmount) || 0) * POINTS_PER_RUPEE);
    if (points > 0 && booking.passengerId) {
      try {
        await this.dataSource.transaction(async (em) => {
          await em.increment(User, { id: booking.passengerId }, 'loyaltyPoints', points);
          const user = await em.findOne(User, { where: { id: booking.passengerId } });
          await em.save(LoyaltyTransaction, {
            userId: booking.passengerId,
            type: LoyaltyTransactionType.EARN,
            points,
            balanceAfter: user?.loyaltyPoints ?? points,
            bookingId: id,
            description: `Earned ${points} pts on booking ${booking.pnr}`,
          });
        });
      } catch (err) {
        this.logger.warn(`Loyalty earn failed for booking ${id}: ${err.message}`);
      }
    }

    // Notify the passenger their seat is confirmed.
    await this.notifyConfirmed(booking);

    return booking;
  }

  async getTripBookings(tripId: string): Promise<Booking[]> {
    return this.bookingRepo.find({ where: { tripId, status: BookingStatus.CONFIRMED } });
  }

  /**
   * Boarding manifest for an operator: one row per booked seat with the
   * passenger's name/CNIC and the booker's contact phone. Ownership-checked —
   * an operator can only see manifests for trips their own company runs.
   */
  async getManifest(tripId: string, requesterId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.companyId !== requesterId) {
      throw new ForbiddenException('This trip belongs to another operator');
    }

    const bookings = await this.bookingRepo.find({
      where: { tripId, status: BookingStatus.CONFIRMED },
      order: { createdAt: 'ASC' },
    });

    // Contact phone comes from the booker's account.
    const passengerIds = [...new Set(bookings.map((b) => b.passengerId).filter(Boolean))];
    const users = passengerIds.length
      ? await this.userRepo.find({ where: { id: In(passengerIds) } })
      : [];
    const phoneById = new Map(users.map((u) => [u.id, u.phone]));

    const passengers = bookings.flatMap((b) => {
      const details = b.passengerDetails?.length
        ? b.passengerDetails
        : b.seatNumbers.map((seatNumber) => ({ seatNumber, name: '—', cnic: undefined }));
      return details.map((p) => ({
        seatNumber: p.seatNumber,
        name: p.name,
        cnic: p.cnic ?? null,
        pnr: b.pnr,
        contactPhone: phoneById.get(b.passengerId) ?? null,
      }));
    });
    passengers.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));

    return {
      tripId,
      totalSeats: Object.keys(trip.seatAvailability || {}).length,
      booked: passengers.length,
      passengers,
    };
  }

  /**
   * Confirmed revenue grouped by trip — used by fleet financial analytics to
   * roll revenue up per bus.
   */
  async getRevenueByTrips(tripIds: string[]): Promise<Record<string, number>> {
    if (!tripIds.length) return {};
    const rows = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.tripId', 'tripId')
      .addSelect('COALESCE(SUM(b.finalAmount), 0)', 'revenue')
      .where('b.tripId IN (:...tripIds)', { tripIds })
      .andWhere('b.status = :s', { s: BookingStatus.CONFIRMED })
      .groupBy('b.tripId')
      .getRawMany();
    return Object.fromEntries(rows.map((r) => [r.tripId, Number(r.revenue)]));
  }

  /**
   * Agent earnings summary: tickets they issued (bookedById = agent), total
   * sales and the 5% commission earned on confirmed bookings.
   */
  async getAgentSummary(agentId: string) {
    const bookings = await this.bookingRepo.find({
      where: { bookedById: agentId, status: BookingStatus.CONFIRMED },
      order: { createdAt: 'DESC' },
    });
    const totalSales = bookings.reduce((sum, b) => sum + Number(b.finalAmount || 0), 0);
    return {
      ticketsIssued: bookings.length,
      totalSales,
      commissionRate: AGENT_COMMISSION_RATE,
      commission: Math.round(totalSales * AGENT_COMMISSION_RATE),
      recent: bookings.slice(0, 10).map((b) => ({ pnr: b.pnr, seats: b.seatNumbers, amount: b.finalAmount })),
    };
  }

  /**
   * Business stats for an operator's dashboard: trips, bookings, revenue and
   * seat occupancy — all scoped to trips this company runs.
   */
  async getOperatorStats(companyId: string) {
    const trips = await this.tripRepo.find({ where: { companyId } });
    const tripIds = trips.map((t) => t.id);
    const now = new Date();
    const upcomingTrips = trips.filter(
      (t) => new Date(t.departureTime) > now && ['SCHEDULED', 'BOARDING'].includes(t.status),
    ).length;

    let totalBookings = 0;
    let todayBookings = 0;
    let totalRevenue = 0;
    if (tripIds.length) {
      const bookings = await this.bookingRepo.find({
        where: { tripId: In(tripIds), status: BookingStatus.CONFIRMED },
      });
      totalBookings = bookings.length;
      totalRevenue = bookings.reduce((sum, b) => sum + Number(b.finalAmount || 0), 0);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      todayBookings = bookings.filter((b) => new Date(b.createdAt) >= startOfToday).length;
    }

    let totalSeats = 0;
    let bookedSeats = 0;
    for (const t of trips) {
      const statuses = Object.values(t.seatAvailability || {});
      totalSeats += statuses.length;
      bookedSeats += statuses.filter((s) => s === 'BOOKED').length;
    }
    const occupancyPct = totalSeats ? Math.round((bookedSeats / totalSeats) * 100) : 0;

    return { totalTrips: trips.length, upcomingTrips, totalBookings, todayBookings, totalRevenue, occupancyPct };
  }

  /**
   * Seat map for a trip with LIVE lock state merged in. Confirmed seats are
   * BOOKED (from the trip), seats another passenger is mid-checkout on show as
   * LOCKED (🟨), everything else AVAILABLE — so the UI never offers a seat
   * someone else is already holding.
   */
  async getSeatMap(tripId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const seatAvailability: Record<string, string> = { ...trip.seatAvailability };
    const lockedSeats = await this.seatLockService.getLockedSeats(tripId);
    for (const seat of lockedSeats) {
      // Don't override a real BOOKED seat — only AVAILABLE → LOCKED.
      if (seatAvailability[seat] === 'AVAILABLE') seatAvailability[seat] = 'LOCKED';
    }

    // Include the real bus geometry so the UI can draw an actual bus (driver,
    // aisle, window/aisle seats) instead of a naive 4-wide grid.
    const bus = await this.busRepo.findOne({ where: { id: trip.busId } });

    // Gender of each occupied seat → UI paints female seats pink.
    const seatRows = await this.bookingSeatRepo.find({
      where: [
        { tripId, status: 'CONFIRMED' },
        { tripId, status: 'HELD' },
      ],
    });
    const seatGenders: Record<string, string> = {};
    for (const s of seatRows) if (s.gender) seatGenders[s.seatNumber] = s.gender;

    return {
      tripId,
      seatAvailability,
      seatGenders,
      seatLayout: bus?.seatLayout ?? null,
      busType: bus?.busType ?? null,
      totalSeats: bus?.totalSeats ?? Object.keys(seatAvailability).length,
      basePrice: Number(trip.basePrice),
    };
  }
}
