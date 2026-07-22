import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';

interface Leg { account: string; direction: 'DEBIT' | 'CREDIT'; amount: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Double-entry ledger — the platform's book of record for all money movement. */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(@InjectRepository(LedgerEntry) private readonly repo: Repository<LedgerEntry>) {}

  /** Post a balanced transaction (Σ debits must equal Σ credits). */
  async post(txnId: string, legs: Leg[], opts: { ref?: string; memo?: string } = {}) {
    const debits = round2(legs.filter((l) => l.direction === 'DEBIT').reduce((s, l) => s + l.amount, 0));
    const credits = round2(legs.filter((l) => l.direction === 'CREDIT').reduce((s, l) => s + l.amount, 0));
    if (debits !== credits) {
      // Never let an accounting error break the business flow — log & skip.
      this.logger.error(`Unbalanced ledger txn ${txnId}: DR ${debits} != CR ${credits}`);
      return { posted: false, reason: 'unbalanced' };
    }
    await this.repo.save(
      legs.map((l) => this.repo.create({ txnId, account: l.account, direction: l.direction, amount: round2(l.amount), ref: opts.ref, memo: opts.memo })),
    );
    return { posted: true, txnId };
  }

  /** Convenience posters for the common money events. */
  async recordSale(paymentId: string, amount: number, commission: number, bookingId?: string) {
    const net = round2(amount - commission);
    return this.post(
      `sale:${paymentId}`,
      [
        { account: 'gateway_clearing', direction: 'DEBIT', amount },
        { account: 'operator_payable', direction: 'CREDIT', amount: net },
        { account: 'platform_revenue', direction: 'CREDIT', amount: commission },
      ],
      { ref: bookingId ?? paymentId, memo: 'Ticket sale' },
    );
  }

  async recordRefund(paymentId: string, amount: number, bookingId?: string) {
    return this.post(
      `refund:${paymentId}:${Date.now()}`,
      [
        { account: 'operator_payable', direction: 'DEBIT', amount },
        { account: 'passenger_wallet', direction: 'CREDIT', amount },
      ],
      { ref: bookingId ?? paymentId, memo: 'Refund' },
    );
  }

  async recordPayout(settlementId: string, amount: number) {
    return this.post(
      `payout:${settlementId}`,
      [
        { account: 'operator_payable', direction: 'DEBIT', amount },
        { account: 'bank_out', direction: 'CREDIT', amount },
      ],
      { ref: settlementId, memo: 'Operator payout' },
    );
  }

  /** Net balance per account (credits − debits). Should reconcile to zero overall. */
  async balances() {
    const rows = await this.repo.query(`
      SELECT account,
             COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END), 0)::numeric AS balance
      FROM ledger_entries GROUP BY account ORDER BY account
    `);
    const total = rows.reduce((s: number, r: any) => s + Number(r.balance), 0);
    return { accounts: rows.map((r: any) => ({ account: r.account, balance: Number(r.balance) })), netZeroCheck: round2(total) };
  }

  recent(limit = 100) {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
