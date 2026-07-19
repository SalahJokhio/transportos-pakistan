import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One leg of a double-entry transaction. Every money movement posts a balanced
 * set of legs (Σ debits = Σ credits), so the books always reconcile — the
 * "book of record" for operator float, platform revenue and refunds.
 *
 * Accounts: gateway_clearing, cash, operator_payable, platform_revenue,
 * passenger_wallet, bank_out.
 */
@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Groups the legs of one transaction together.
  @Index()
  @Column()
  txnId: string;

  @Index()
  @Column()
  account: string;

  // DEBIT | CREDIT
  @Column()
  direction: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  ref: string; // bookingId / paymentId / settlementId

  @Column({ nullable: true })
  memo: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
