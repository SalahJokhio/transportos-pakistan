import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A driver's on-trip report: an incident (tyre puncture, breakdown…), a refuel,
 * or an expense (toll, repair, food…). Attaches photos/videos and an amount so
 * the owner can trace what happened and what was spent per trip and per bus —
 * the raw data behind fleet profit/loss.
 */
@Entity('trip_reports')
export class TripReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tripId: string;

  @Index()
  @Column()
  driverId: string;

  // Denormalised so bus-level expense totals are a simple query.
  @Index()
  @Column({ nullable: true })
  busId: string;

  @Index()
  @Column({ nullable: true })
  companyId: string;

  // 'INCIDENT' | 'REFUEL' | 'EXPENSE' | 'NOTE'
  @Column()
  type: string;

  // e.g. TYRE_PUNCTURE, BREAKDOWN, FUEL, TOLL, REPAIR, FOOD, OTHER
  @Column({ nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Money spent (refuel + expenses). 0 for pure incidents/notes.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  // Litres for a refuel (nullable otherwise).
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  litres: number;

  // Photo / video URLs (from the upload endpoint).
  @Column({ type: 'jsonb', default: [] })
  mediaUrls: string[];

  @Column({ type: 'double precision', nullable: true })
  lat: number;

  @Column({ type: 'double precision', nullable: true })
  lng: number;

  @CreateDateColumn()
  createdAt: Date;
}
