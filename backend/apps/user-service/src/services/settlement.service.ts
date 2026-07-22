import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Settlement } from '../entities/settlement.entity';
import { LedgerService } from './ledger.service';
import { LendingService } from './lending.service';

const DEFAULT_COMMISSION_PCT = Number(process.env.PLATFORM_COMMISSION_PCT ?? 10);

interface OperatorPayable {
  companyId: string;
  companyName: string;
  phone: string | null;
  bookingCount: number;
  gross: number;
  commissionPct: number;
  commission: number;
  net: number;
  settled: number;
  outstanding: number;
}

/**
 * The settlement engine: what the platform owes each operator. Revenue is the
 * sum of CONFIRMED bookings on that operator's trips; the platform keeps a
 * commission; the rest is payable. `settled` is what we've already paid out, so
 * `outstanding` is the cheque still to write.
 */
@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Settlement) private readonly settlementRepo: Repository<Settlement>,
    private readonly ledger: LedgerService,
    private readonly lending: LendingService,
  ) {}

  /** Live payable summary per operator (gross → commission → net → outstanding). */
  async summary(): Promise<{ commissionPct: number; operators: OperatorPayable[]; totals: any }> {
    const pct = DEFAULT_COMMISSION_PCT;

    // Confirmed-booking revenue grouped by the trip's operator.
    const rows: Array<{ companyId: string; bookingCount: number; gross: string }> =
      await this.settlementRepo.query(`
        SELECT t."companyId" AS "companyId",
               COUNT(b.id)::int AS "bookingCount",
               COALESCE(SUM(b."finalAmount"), 0)::numeric AS "gross"
        FROM bookings b
        JOIN trips t ON t.id::text = b."tripId"
        WHERE b.status = 'CONFIRMED'
        GROUP BY t."companyId"
      `);

    // Already-paid-out totals per operator.
    const paidRows: Array<{ companyId: string; paid: string }> = await this.settlementRepo.query(`
      SELECT "companyId", COALESCE(SUM("netPayable"), 0)::numeric AS "paid"
      FROM settlements WHERE status = 'PAID' GROUP BY "companyId"
    `);
    const paidBy = new Map(paidRows.map((r) => [r.companyId, Number(r.paid)]));

    const ids = rows.map((r) => r.companyId).filter(Boolean);
    const operators = ids.length ? await this.userRepo.findByIds(ids) : [];
    const opBy = new Map(operators.map((o) => [o.id, o]));

    const list: OperatorPayable[] = rows.map((r) => {
      const gross = Number(r.gross);
      const commission = Math.round(gross * pct) / 100;
      const net = gross - commission;
      const settled = paidBy.get(r.companyId) ?? 0;
      const op = opBy.get(r.companyId);
      return {
        companyId: r.companyId,
        companyName: op ? `${op.firstName ?? ''} ${op.lastName ?? ''}`.trim() || 'Operator' : 'Operator',
        phone: op?.phone ?? null,
        bookingCount: Number(r.bookingCount),
        gross,
        commissionPct: pct,
        commission,
        net,
        settled,
        outstanding: Math.max(0, net - settled),
      };
    });

    const totals = list.reduce(
      (a, o) => ({
        gross: a.gross + o.gross,
        commission: a.commission + o.commission,
        net: a.net + o.net,
        outstanding: a.outstanding + o.outstanding,
      }),
      { gross: 0, commission: 0, net: 0, outstanding: 0 },
    );

    return { commissionPct: pct, operators: list, totals };
  }

  /** Snapshot an operator's current outstanding amount as a PENDING settlement. */
  async generate(companyId: string) {
    const { operators } = await this.summary();
    const op = operators.find((o) => o.companyId === companyId);
    if (!op) throw new NotFoundException('No settleable revenue for this operator');
    if (op.outstanding <= 0) throw new BadRequestException('Nothing outstanding to settle');

    return this.settlementRepo.save(
      this.settlementRepo.create({
        companyId: op.companyId,
        companyName: op.companyName,
        bookingCount: op.bookingCount,
        grossAmount: op.gross,
        commissionPct: op.commissionPct,
        commissionAmount: op.commission,
        netPayable: op.outstanding,
        status: 'PENDING',
      }),
    );
  }

  async list(status?: string) {
    const where = status ? { status } : {};
    return this.settlementRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  /** Record that a PENDING settlement was actually paid out. */
  async markPaid(id: string, reference?: string) {
    const s = await this.settlementRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Settlement not found');
    if (s.status === 'PAID') return s;
    await this.settlementRepo.update(id, { status: 'PAID', paidAt: new Date(), reference: reference ?? null });
    this.ledger.recordPayout(id, Number(s.netPayable)).catch(() => undefined);
    // Auto-repay any live operator loan from this payout.
    this.lending.repayFromPayout(s.companyId, Number(s.netPayable)).catch(() => undefined);
    return this.settlementRepo.findOne({ where: { id } });
  }
}
