import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A payout record from the platform to an operator (company). Confirmed-booking
 * revenue for the operator's trips, minus the platform commission, is what the
 * operator is owed. Generating a settlement snapshots the outstanding amount as
 * PENDING; marking it PAID records the actual payout.
 */
@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ type: 'date', nullable: true })
  periodStart: string;

  @Column({ type: 'date', nullable: true })
  periodEnd: string;

  @Column({ type: 'int', default: 0 })
  bookingCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionPct: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netPayable: number;

  // PENDING | PAID
  @Column({ default: 'PENDING' })
  status: string;

  // Payout reference (bank/IBFT ref) once paid.
  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
