import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** A promo/discount code applied at checkout. */
@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  code: string; // stored uppercase

  // PERCENT (value = %) | FLAT (value = rupees off)
  @Column({ default: 'PERCENT' })
  type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  // Cap for percent discounts (0/null = no cap).
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number;

  // Minimum booking subtotal required to use the code.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minAmount: number;

  // Total redemptions allowed (null = unlimited).
  @Column({ type: 'int', nullable: true })
  usageLimit: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
