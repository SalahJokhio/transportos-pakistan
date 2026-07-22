import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole, PaymentStatus } from '@app/common';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { Payment } from '../../../payment-service/src/entities/payment.entity';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';
import { BookingStatus } from '@app/common';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly walletService: WalletService,
    private readonly ledger: LedgerService,
  ) {}

  /** Recent payments with the booking PNR, for the refunds console. */
  async listPayments(limit = 50) {
    const payments = await this.paymentRepo.find({ order: { createdAt: 'DESC' }, take: limit });
    const bookingIds = [...new Set(payments.map((p) => p.bookingId))];
    const bookings = bookingIds.length ? await this.bookingRepo.findByIds(bookingIds) : [];
    const pnrBy = new Map(bookings.map((b) => [b.id, b.pnr]));
    return payments.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      pnr: pnrBy.get(p.bookingId) ?? null,
      provider: p.provider,
      amount: Number(p.amount),
      refundedAmount: Number(p.refundedAmount),
      status: p.status,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Admin-triggered refund. Credits the passenger's wallet with the refunded
   * amount and records it on the payment. Idempotent-ish: a fully-refunded
   * payment can't be refunded again. (Gateway-side reversal for live JazzCash/
   * EasyPaisa is issued by the payment-service; this is the money-back record.)
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.REFUNDED) {
      throw new BadRequestException(`Cannot refund a ${payment.status} payment`);
    }
    const remaining = Number(payment.amount) - Number(payment.refundedAmount);
    const toRefund = amount != null ? Number(amount) : remaining;
    if (toRefund <= 0 || toRefund > remaining) throw new BadRequestException(`Refundable amount is ${remaining}`);

    const booking = await this.bookingRepo.findOne({ where: { id: payment.bookingId } });
    if (booking) {
      await this.walletService.credit(booking.passengerId, toRefund, {
        description: `Refund — ${booking.pnr}${reason ? ` (${reason})` : ''}`,
        bookingId: payment.bookingId,
      });
    }
    const refundedTotal = Number(payment.refundedAmount) + toRefund;
    await this.paymentRepo.update(payment.id, {
      refundedAmount: refundedTotal,
      status: refundedTotal >= Number(payment.amount) ? PaymentStatus.REFUNDED : payment.status,
    });
    this.ledger.recordRefund(payment.id, toRefund, payment.bookingId).catch(() => undefined);
    return { success: true, paymentId: payment.id, refundedAmount: refundedTotal };
  }

  async getPlatformStats() {
    const [totalUsers, activeUsers] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
    ]);

    // Count by role using raw query for efficiency
    const roleCounts: Array<{ role: string; count: string }> = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role')
      .getRawMany();

    const byRole = Object.fromEntries(roleCounts.map((r) => [r.role, Number(r.count)]));

    // New users this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newThisMonth = await this.userRepo
      .createQueryBuilder('u')
      .where('u.createdAt >= :monthStart', { monthStart })
      .getCount();

    // Growth vs last month
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const newLastMonth = await this.userRepo
      .createQueryBuilder('u')
      .where('u.createdAt >= :lastMonthStart AND u.createdAt < :monthStart', { lastMonthStart, monthStart })
      .getCount();

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newThisMonth,
        newLastMonth,
        byRole,
      },
    };
  }

  async listUsers(options: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 20, role, search, isActive } = options;
    const qb = this.userRepo.createQueryBuilder('user');

    if (role) qb.andWhere('user.role = :role', { role });
    if (isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive });
    if (search) {
      qb.andWhere(
        '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s OR user.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    await this.userRepo.update(id, { role });
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  async toggleUserActive(id: string, isActive: boolean): Promise<User> {
    await this.userRepo.update(id, { isActive });
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  async getRevenueStats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const [total, confirmed, cancelled, pending] = await Promise.all([
      this.bookingRepo.count(),
      this.bookingRepo.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.bookingRepo.count({ where: { status: BookingStatus.CANCELLED } }),
      this.bookingRepo.count({ where: { status: BookingStatus.PENDING_PAYMENT } }),
    ]);

    // Total confirmed revenue
    const revenueResult = await this.bookingRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.finalAmount), 0)', 'total')
      .where('b.status = :status', { status: BookingStatus.CONFIRMED })
      .getRawOne();

    const monthRevenueResult = await this.bookingRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.finalAmount), 0)', 'total')
      .where('b.status = :status AND b.createdAt >= :monthStart', {
        status: BookingStatus.CONFIRMED, monthStart,
      })
      .getRawOne();

    const lastMonthRevenueResult = await this.bookingRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.finalAmount), 0)', 'total')
      .where('b.status = :status AND b.createdAt >= :lastMonthStart AND b.createdAt < :monthStart', {
        status: BookingStatus.CONFIRMED, lastMonthStart, monthStart,
      })
      .getRawOne();

    // Recent bookings
    const recent = await this.bookingRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      bookings: { total, confirmed, cancelled, pending },
      revenue: {
        total: Number(revenueResult?.total ?? 0),
        thisMonth: Number(monthRevenueResult?.total ?? 0),
        lastMonth: Number(lastMonthRevenueResult?.total ?? 0),
      },
      recent,
    };
  }

  /** Simple fraud heuristic: users with several cancelled bookings. */
  async getFraudSignals() {
    const rows: Array<{ passengerId: string; cancels: string }> = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.passengerId', 'passengerId')
      .addSelect('COUNT(*)', 'cancels')
      .where('b.status = :s', { s: BookingStatus.CANCELLED })
      .groupBy('b.passengerId')
      .having('COUNT(*) >= :n', { n: 2 })
      .orderBy('cancels', 'DESC')
      .getRawMany();

    const ids = rows.map((r) => r.passengerId).filter(Boolean);
    const users = ids.length ? await this.userRepo.findByIds(ids) : [];
    return {
      flagged: rows.length,
      signals: rows.map((r) => {
        const u = users.find((x) => x.id === r.passengerId);
        return {
          userId: r.passengerId,
          name: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : 'Unknown',
          phone: u?.phone ?? null,
          cancellations: Number(r.cancels),
          reason: 'High cancellation rate',
        };
      }),
    };
  }

  async getOperators() {
    const operators = await this.userRepo.find({
      where: { role: UserRole.COMPANY_ADMIN },
      order: { createdAt: 'DESC' },
    });
    return operators;
  }
}
