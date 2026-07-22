import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * The Event Engine's log. Every meaningful action in the platform emits one
 * of these (BOOKING_CREATED, TRIP_DELAYED, INSURANCE_EXPIRING, …). The Rules
 * Engine listens to this stream and fires configured actions.
 */
@Entity('platform_events')
@Index(['companyId', 'type'])
export class PlatformEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Null for platform-wide events; otherwise the tenant the event belongs to.
  @Index()
  @Column({ nullable: true })
  companyId: string;

  // Canonical event name, e.g. "BOOKING_CREATED".
  @Index()
  @Column()
  type: string;

  // Arbitrary event data the rules evaluate against (dot-path addressable).
  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  // Where it came from (service/controller) — handy for debugging.
  @Column({ nullable: true })
  source: string;

  // How many rules matched + fired when this event was processed.
  @Column({ type: 'int', default: 0 })
  matchedRules: number;

  @CreateDateColumn()
  createdAt: Date;
}
