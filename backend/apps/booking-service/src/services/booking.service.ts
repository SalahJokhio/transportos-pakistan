import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { CreateBookingDto, CancelBookingDto } from '../dto/booking.dto';
import { BookingStatus, StringUtil } from '@app/common';
import { User } from '../../../user-service/src/entities/user.entity';
import { LoyaltyTransaction, LoyaltyTransactionType } from '../../../user-service/src/entities/loyalty-transaction.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';

// 1 loyalty point per Rs 10 spent
const POINTS_PER_RUPEE = 1 / 10;

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(LoyaltyTransaction) private readonly loyaltyRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateBookingDto, passengerId: string, bookedById?: string): Promise<Booking> {
    const pnr = StringUtil.generateReference('TOS');
    const booking = this.bookingRepo.create({
      pnr,
      tripId: dto.tripId,
      passengerId,
      bookedById,
      seatNumbers: dto.seatNumbers,
      passengerDetails: dto.passengerDetails,
      totalAmount: 0,
      discountAmount: 0,
      finalAmount: 0,
      status: BookingStatus.PENDING_PAYMENT,
    });
    return this.bookingRepo.save(booking);
  }

  async findByPnr(pnr: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { pnr } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return this.bookingRepo.find({ where: { passengerId: userId }, order: { createdAt: 'DESC' } });
  }

  async cancel(id: string, dto: CancelBookingDto, userId: string): Promise<Booking> {
    const booking = await this.findById(id);
    if (booking.passengerId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Already cancelled');
    if (booking.status === BookingStatus.COMPLETED) throw new BadRequestException('Cannot cancel completed booking');

    await this.dataSource.transaction(async (em) => {
      // Mark booking cancelled
      await em.update(Booking, id, {
        status: BookingStatus.CANCELLED,
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
      });

      // Release seats back to AVAILABLE on the trip
      const trip = await em.findOne(Trip, { where: { id: booking.tripId } });
      if (trip) {
        const updated = { ...trip.seatAvailability };
        booking.seatNumbers.forEach((seat) => {
          if (updated[seat] === 'BOOKED') updated[seat] = 'AVAILABLE';
        });
        await em.update(Trip, booking.tripId, { seatAvailability: updated });
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

    return this.findById(id);
  }

  async confirm(id: string, paymentId: string): Promise<Booking> {
    await this.bookingRepo.update(id, { status: BookingStatus.CONFIRMED, paymentId });
    const booking = await this.findById(id);

    // Mark seats as BOOKED on the trip
    try {
      const trip = await this.tripRepo.findOne({ where: { id: booking.tripId } });
      if (trip) {
        const updated = { ...trip.seatAvailability };
        booking.seatNumbers.forEach((seat) => { updated[seat] = 'BOOKED'; });
        await this.tripRepo.update(booking.tripId, { seatAvailability: updated });
      }
    } catch (err) {
      this.logger.warn(`Seat status update failed for booking ${id}: ${err.message}`);
    }

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

    return booking;
  }

  async getTripBookings(tripId: string): Promise<Booking[]> {
    return this.bookingRepo.find({ where: { tripId, status: BookingStatus.CONFIRMED } });
  }
}
