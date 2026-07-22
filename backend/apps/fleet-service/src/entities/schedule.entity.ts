import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A recurring trip template. Instead of creating each trip by hand, the operator
 * sets a schedule (route + bus + departure time + days of week); a daily job
 * generates the actual Trip rows for the next few days.
 */
@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column()
  routeId: string;

  @Column()
  busId: string;

  @Column({ nullable: true })
  driverId: string;

  // Departure time-of-day, "HH:MM" (24h).
  @Column()
  departureTime: string;

  // Days the trip runs: 0=Sun … 6=Sat.
  @Column({ type: 'int', array: true, default: [] })
  daysOfWeek: number[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePrice: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
