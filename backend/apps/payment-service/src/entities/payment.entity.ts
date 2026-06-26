import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentStatus } from '@app/common';

/**
 * One row per payment attempt against a booking.
 *
 * `idempotencyKey` is UNIQUE — this is the #2 trust-killer guard (architecture
 * doc §6). A Pakistani payment rail timing out does NOT mean the charge failed;
 * the client may retry. Carrying the same key means a retry returns the original
 * payment instead of charging twice. By default the key is the bookingId, so a
 * booking can have at most one settled payment.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  bookingId: string;

  // 'jazzcash' | 'easypaisa' | 'mock'
  @Column()
  provider: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // How much was refunded when the booking was cancelled (0 if none).
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  // Gateway transaction reference (pp_TxnRefNo etc.) — how callbacks find us.
  @Index()
  @Column({ nullable: true })
  providerRef: string;

  @Index({ unique: true })
  @Column()
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
