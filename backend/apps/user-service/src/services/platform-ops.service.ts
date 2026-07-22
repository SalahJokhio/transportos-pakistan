import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { Payment } from '../../../payment-service/src/entities/payment.entity';
import { CatalogService } from './catalog.service';

function csvEscape(v: any): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows: any[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

/** Fraud rules engine, finance/tax CSV exports, and a system-health probe. */
@Injectable()
export class PlatformOpsService {
  private readonly startedAt = Date.now();

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly catalog: CatalogService,
  ) {}

  // ---- Fraud rules engine ----------------------------------------------
  async fraudSignals() {
    const rules = await this.catalog.getFraudRules();
    const signals: any[] = [];

    // 1. High cancellation rate (configurable threshold).
    const cancels: Array<{ passengerId: string; n: string }> = await this.bookingRepo.query(
      `SELECT "passengerId", COUNT(*)::text AS n FROM bookings WHERE status='CANCELLED'
       GROUP BY "passengerId" HAVING COUNT(*) >= $1 ORDER BY COUNT(*) DESC`,
      [rules.maxCancellations],
    );
    // 2. Booking velocity (too many bookings in the last hour).
    const velocity: Array<{ passengerId: string; n: string }> = await this.bookingRepo.query(
      `SELECT "passengerId", COUNT(*)::text AS n FROM bookings
       WHERE "createdAt" >= now() - interval '1 hour'
       GROUP BY "passengerId" HAVING COUNT(*) > $1 ORDER BY COUNT(*) DESC`,
      [rules.maxBookingsPerHour],
    );

    const ids = [...new Set([...cancels, ...velocity].map((r) => r.passengerId).filter(Boolean))];
    const users = ids.length ? await this.userRepo.findByIds(ids) : [];
    const nameOf = (id: string) => {
      const u = users.find((x) => x.id === id);
      return { name: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : 'Unknown', phone: u?.phone ?? null };
    };

    for (const c of cancels) signals.push({ userId: c.passengerId, ...nameOf(c.passengerId), reason: 'High cancellations', value: Number(c.n) });
    for (const v of velocity) signals.push({ userId: v.passengerId, ...nameOf(v.passengerId), reason: 'Booking velocity (1h)', value: Number(v.n) });
    for (const phone of rules.blockedPhones || []) signals.push({ userId: null, name: 'Blocklisted', phone, reason: 'Blocked phone', value: 1 });

    return { rules, flagged: signals.length, signals };
  }

  // ---- Finance / tax CSV exports ---------------------------------------
  async exportBookingsCsv(from?: string, to?: string): Promise<string> {
    const params: any[] = [];
    let where = "b.status = 'CONFIRMED'";
    if (from) { params.push(from); where += ` AND b."createdAt" >= $${params.length}`; }
    if (to) { params.push(to); where += ` AND b."createdAt" <= $${params.length}`; }
    const rows: any[] = await this.bookingRepo.query(
      `SELECT b.pnr, b."tripId", b.status, b."totalAmount", b."discountAmount", b."finalAmount", b."createdAt"
       FROM bookings b WHERE ${where} ORDER BY b."createdAt" DESC LIMIT 10000`,
      params,
    );
    // FBR-style GST breakdown from a GST-inclusive final amount (16%).
    const enriched = rows.map((r) => {
      const final = Number(r.finalAmount);
      const gst = Math.round((final * 16) / 116);
      return { pnr: r.pnr, tripId: r.tripId, status: r.status, subtotal: r.totalAmount, discount: r.discountAmount, gst, total: final, date: new Date(r.createdAt).toISOString().slice(0, 10) };
    });
    return toCsv(enriched, ['pnr', 'tripId', 'status', 'subtotal', 'discount', 'gst', 'total', 'date']);
  }

  async exportPaymentsCsv(from?: string, to?: string): Promise<string> {
    const params: any[] = [];
    let where = '1=1';
    if (from) { params.push(from); where += ` AND "createdAt" >= $${params.length}`; }
    if (to) { params.push(to); where += ` AND "createdAt" <= $${params.length}`; }
    const rows: any[] = await this.paymentRepo.query(
      `SELECT id, "bookingId", provider, amount, "refundedAmount", status, "createdAt" FROM payments WHERE ${where} ORDER BY "createdAt" DESC LIMIT 10000`,
      params,
    );
    return toCsv(rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
      ['id', 'bookingId', 'provider', 'amount', 'refundedAmount', 'status', 'createdAt']);
  }

  // ---- System health ----------------------------------------------------
  async systemHealth() {
    let db = 'down';
    let counts: any = {};
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
      const [users, bookings, payments] = await Promise.all([
        this.userRepo.count(), this.bookingRepo.count(), this.paymentRepo.count(),
      ]);
      counts = { users, bookings, payments };
    } catch { db = 'down'; }

    const mem = process.memoryUsage();
    return {
      status: db === 'up' ? 'healthy' : 'degraded',
      database: db,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      memoryMB: Math.round(mem.rss / 1048576),
      counts,
      timestamp: new Date().toISOString(),
    };
  }
}
