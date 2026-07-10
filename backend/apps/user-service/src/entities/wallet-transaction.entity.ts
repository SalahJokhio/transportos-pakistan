import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** A movement on a user's wallet — top-up, ticket payment, refund, points redeem. */
@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  // 'TOPUP' | 'PAYMENT' | 'REFUND' | 'POINTS_REDEEM'
  @Column()
  type: string;

  // Signed: positive = credit, negative = debit.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  bookingId: string;

  @CreateDateColumn()
  createdAt: Date;
}
