import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { BookingStatus } from '@app/common';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  pnr: string;

  // Client-supplied dedup key: a double-tapped "Book" (common on PK networks)
  // returns the original booking instead of creating a second one. Nullable +
  // unique (Postgres allows many NULLs, so old rows are unaffected).
  @Index({ unique: true })
  @Column({ nullable: true })
  idempotencyKey: string;

  @Column()
  tripId: string;

  @Column()
  passengerId: string;

  @Column({ nullable: true })
  bookedById: string;

  @Column('text', { array: true })
  seatNumbers: string[];

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING_PAYMENT })
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number;

  @Column({ nullable: true })
  paymentId: string;

  @Column({ nullable: true })
  cancellationReason: string;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  passengerDetails: Array<{
    name: string;
    cnic?: string;
    seatNumber: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
