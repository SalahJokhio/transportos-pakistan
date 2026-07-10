import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * One row per (trip, seat) a booking touches. This is the real safety net
 * against double-booking — see TravelOS architecture doc §4/§5.
 *
 * The partial UNIQUE index guarantees that at most ONE booking can hold a
 * given seat on a given trip in the CONFIRMED state. Two passengers racing
 * for the same seat will both create HELD rows, but only the first to
 * confirm can flip to CONFIRMED; the second hits a unique-violation and is
 * rejected by the database itself, not by application logic that can race.
 */
@Entity('booking_seats')
@Index('uq_confirmed_seat', ['tripId', 'seatNumber'], {
  unique: true,
  where: `"status" = 'CONFIRMED'`,
})
export class BookingSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tripId: string;

  @Column()
  seatNumber: string;

  @Index()
  @Column()
  bookingId: string;

  @Column({ nullable: true })
  passengerId: string;

  // Passenger gender for this seat: 'M' | 'F' | null. Drives female-seat colour
  // and the "no male beside a lone female" rule (Bookkaru-style seating).
  @Column({ type: 'varchar', length: 1, nullable: true })
  gender: string;

  // 'HELD' while awaiting payment, 'CONFIRMED' once paid, 'CANCELLED' on release.
  @Column({ default: 'HELD' })
  status: 'HELD' | 'CONFIRMED' | 'CANCELLED';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
