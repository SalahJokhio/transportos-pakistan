/// <reference types="jest" />
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { BookingService } from '../../src/services/booking.service';
import { SeatLockService } from '../../src/services/seat-lock.service';
import { PricingService } from '../../src/services/pricing.service';
import { CouponService } from '../../src/services/coupon.service';
import { Booking } from '../../src/entities/booking.entity';
import { BookingSeat } from '../../src/entities/booking-seat.entity';
import { FunnelEvent } from '../../src/entities/funnel-event.entity';
import { BookingStatus } from '@app/common';
import { EventBusService } from '../../../automation-service/src/services/event-bus.service';
import { User } from '../../../user-service/src/entities/user.entity';
import { LoyaltyTransaction } from '../../../user-service/src/entities/loyalty-transaction.entity';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { NotificationService } from '../../../notification-service/src/notification.service';

/**
 * Guard-branch tests for the booking core. These don't hit a database — they
 * verify the *contract* the booking flow promises: you can't book without
 * holding the lock, you can't book an already-sold seat, and a DB-level
 * double-booking (unique violation) surfaces as a clean 409, not a 500.
 * The real end-to-end concurrency proof lives in the integration spec.
 */
describe('BookingService (guard branches)', () => {
  let service: BookingService;
  let seatLock: { holdsAll: jest.Mock; release: jest.Mock };
  let bookingRepo: { findOne: jest.Mock };
  let tripRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const repoMock = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() });

  beforeEach(async () => {
    seatLock = { holdsAll: jest.fn(), release: jest.fn().mockResolvedValue(undefined) };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingService,
        PricingService,
        { provide: CouponService, useValue: { validate: jest.fn().mockResolvedValue({ valid: false, discount: 0 }), redeem: jest.fn() } },
        { provide: SeatLockService, useValue: seatLock },
        { provide: NotificationService, useValue: { sendBookingConfirmation: jest.fn(), sendCancellationNotice: jest.fn() } },
        { provide: EventBusService, useValue: { emit: jest.fn().mockResolvedValue(undefined) } },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Booking), useValue: repoMock() },
        { provide: getRepositoryToken(BookingSeat), useValue: repoMock() },
        { provide: getRepositoryToken(FunnelEvent), useValue: repoMock() },
        { provide: getRepositoryToken(User), useValue: repoMock() },
        { provide: getRepositoryToken(LoyaltyTransaction), useValue: repoMock() },
        { provide: getRepositoryToken(Trip), useValue: repoMock() },
        { provide: getRepositoryToken(Route), useValue: repoMock() },
        { provide: getRepositoryToken(Bus), useValue: repoMock() },
      ],
    }).compile();

    service = moduleRef.get(BookingService);
    bookingRepo = moduleRef.get(getRepositoryToken(Booking));
    tripRepo = moduleRef.get(getRepositoryToken(Trip));
  });

  describe('create', () => {
    it('refuses to book when the caller does not hold the seat lock', async () => {
      tripRepo.findOne.mockResolvedValue({ id: 'trip-1', basePrice: 1000, seatAvailability: {} });
      seatLock.holdsAll.mockResolvedValue(false); // lock expired or taken

      await expect(
        service.create({ tripId: 'trip-1', seatNumbers: ['3A'], passengerDetails: [] }, 'passenger-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('refuses a seat already marked BOOKED on the trip', async () => {
      tripRepo.findOne.mockResolvedValue({ id: 'trip-1', basePrice: 1000, seatAvailability: { '3A': 'BOOKED' } });
      seatLock.holdsAll.mockResolvedValue(true);

      await expect(
        service.create({ tripId: 'trip-1', seatNumbers: ['3A'], passengerDetails: [] }, 'passenger-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('is a no-op when the booking is already CONFIRMED (webhook retry safe)', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b1', status: BookingStatus.CONFIRMED });

      const result = await service.confirm('b1', 'pay-1');
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(dataSource.transaction).not.toHaveBeenCalled(); // no re-write
    });

    it('rejects confirming a CANCELLED booking', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED });

      await expect(service.confirm('b1', 'pay-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    // The heart of the guarantee: if the partial unique index fires (someone
    // else confirmed the seat first), the passenger gets a 409, not a 500.
    it('translates a DB unique violation into a 409 Conflict', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.PENDING_PAYMENT,
        tripId: 'trip-1',
        seatNumbers: ['3A'],
      });
      const dup = new QueryFailedError('update', [], new Error('duplicate key'));
      (dup as any).code = '23505'; // Postgres unique_violation
      dataSource.transaction.mockRejectedValue(dup);

      await expect(service.confirm('b1', 'pay-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
