import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A working-capital advance to an operator against future ticket revenue. Repaid
 * automatically by deducting a slice of each settlement payout. High-margin,
 * and only the platform can offer it because only it holds the revenue data.
 */
@Entity('operator_loans')
export class OperatorLoan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  principal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5 })
  feePct: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalDue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountRepaid: number;

  // REQUESTED | APPROVED | DISBURSED | REPAID | REJECTED
  @Column({ default: 'REQUESTED' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
