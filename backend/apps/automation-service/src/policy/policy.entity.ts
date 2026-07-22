import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

/** Per-tenant operating policy knobs (one row per company; null = platform default). */
@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  companyId: string;

  // { maxWorkingHours, minRestHours, maxRefundPct, fuelLimitPerTrip, speedLimitKmh, lateArrivalGraceMin }
  @Column({ type: 'jsonb', default: {} })
  values: Record<string, number>;

  @UpdateDateColumn()
  updatedAt: Date;
}
