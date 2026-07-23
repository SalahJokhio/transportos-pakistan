import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** Per-tenant SLA tiers: priority → response/resolve hours (null companyId = platform default). */
@Entity('sla_configs')
export class SlaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  companyId: string;

  // { URGENT: {response, resolve}, HIGH: {...}, MEDIUM: {...}, LOW: {...} } — hours
  @Column({ type: 'jsonb', default: {} })
  tiers: Record<string, { response: number; resolve: number }>;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** An escalation raised when an item breaches SLA — also the dedup ledger so the
 *  monitor doesn't re-escalate the same item at the same level every run. */
@Entity('sla_escalations')
@Index(['subjectType', 'subjectId', 'level'], { unique: true })
export class SlaEscalation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyId: string;

  @Column({ default: 'TICKET' })
  subjectType: string; // TICKET (extensible: WORKFLOW, TRIP…)

  @Column()
  subjectId: string;

  @Column({ type: 'int', default: 1 })
  level: number; // 1 = response breached, 2 = resolve breached

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
