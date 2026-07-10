import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One row per GPS ping from a driver. Gives us trip replay, ETA analytics and
 * an audit trail of where a bus actually was.
 *
 * On a plain Postgres this is an ordinary table; in production it becomes a
 * TimescaleDB hypertable on `recordedAt` (architecture doc §7) since GPS
 * ingestion is the heaviest write load in the system.
 */
@Entity('gps_logs')
@Index('idx_gps_trip_time', ['tripId', 'recordedAt'])
export class GpsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tripId: string;

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  lng: number;

  @Column({ type: 'double precision', nullable: true })
  speed: number;

  @Column({ type: 'double precision', nullable: true })
  heading: number;

  @CreateDateColumn()
  recordedAt: Date;
}
