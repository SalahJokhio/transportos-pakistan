import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorLoan } from '../entities/operator-loan.entity';

const FEE_PCT = 5;
const MAX_ADVANCE_OF_MONTHLY = 0.3; // offer up to 30% of last-30-day revenue
const REPAY_RATE = 0.2; // deduct 20% of each payout toward the loan

/**
 * Operator working-capital lending against future ticket revenue. Only the
 * platform can offer this — it alone holds the operator's real revenue history.
 * Repaid automatically from settlement payouts.
 */
@Injectable()
export class LendingService {
  constructor(@InjectRepository(OperatorLoan) private readonly repo: Repository<OperatorLoan>) {}

  private async monthlyRevenue(companyId: string): Promise<number> {
    const rows = await this.repo.query(
      `SELECT COALESCE(SUM(b."finalAmount"), 0)::numeric AS rev
       FROM bookings b JOIN trips t ON t.id::text = b."tripId"
       WHERE t."companyId" = $1 AND b.status = 'CONFIRMED' AND b."createdAt" >= now() - interval '30 days'`,
      [companyId],
    );
    return Number(rows[0]?.rev ?? 0);
  }

  private async outstanding(companyId: string): Promise<number> {
    const rows = await this.repo.query(
      `SELECT COALESCE(SUM("totalDue" - "amountRepaid"), 0)::numeric AS due
       FROM operator_loans WHERE "companyId" = $1 AND status = 'DISBURSED'`,
      [companyId],
    );
    return Number(rows[0]?.due ?? 0);
  }

  async offer(companyId: string) {
    const monthly = await this.monthlyRevenue(companyId);
    const outstanding = await this.outstanding(companyId);
    const maxOffer = Math.max(0, Math.round(monthly * MAX_ADVANCE_OF_MONTHLY) - outstanding);
    return { monthlyRevenue: monthly, outstanding, feePct: FEE_PCT, maxOffer, eligible: maxOffer >= 1000 };
  }

  async request(companyId: string, amount: number) {
    const { maxOffer } = await this.offer(companyId);
    if (amount <= 0 || amount > maxOffer) throw new BadRequestException(`You can request up to Rs ${maxOffer}`);
    const totalDue = Math.round(amount * (1 + FEE_PCT / 100));
    return this.repo.save(this.repo.create({ companyId, principal: amount, feePct: FEE_PCT, totalDue, status: 'REQUESTED' }));
  }

  list(companyId: string) {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  listAll(status?: string) {
    return this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' }, take: 200 });
  }

  async setStatus(id: string, status: string) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Loan not found');
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }

  /** Auto-repay from a settlement payout — deducts a slice toward the oldest live loan. */
  async repayFromPayout(companyId: string, payoutAmount: number): Promise<number> {
    const loan = await this.repo.findOne({ where: { companyId, status: 'DISBURSED' }, order: { createdAt: 'ASC' } });
    if (!loan) return 0;
    const remaining = Number(loan.totalDue) - Number(loan.amountRepaid);
    const deduct = Math.min(Math.round(payoutAmount * REPAY_RATE), remaining);
    if (deduct <= 0) return 0;
    const repaid = Number(loan.amountRepaid) + deduct;
    await this.repo.update(loan.id, { amountRepaid: repaid, status: repaid >= Number(loan.totalDue) ? 'REPAID' : 'DISBURSED' });
    return deduct;
  }
}
