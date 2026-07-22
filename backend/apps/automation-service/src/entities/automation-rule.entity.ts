import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface RuleCondition {
  field: string; // dot-path into the event payload, e.g. "passenger.age"
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'exists';
  value?: any;
}

export interface RuleAction {
  type: 'notify' | 'alert' | 'webhook' | 'log';
  // notify: channel(sms|whatsapp), to (dot-path or literal), message (supports {{payload.x}})
  // alert:  severity(info|warning|critical), title, message
  // webhook: url, (method default POST)
  [key: string]: any;
}

/**
 * A no-code IF/THEN rule. When an event of `eventType` fires for the tenant,
 * every ACTIVE rule whose `conditions` all match runs its `actions`. This is
 * the configurable heart of the platform (SAP/Oracle-style Business Rules).
 */
@Entity('automation_rules')
@Index(['companyId', 'eventType', 'isActive'])
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Null = a platform-wide rule that applies to every tenant.
  @Column({ nullable: true })
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Which event triggers evaluation, e.g. "BOOKING_CREATED".
  @Column()
  eventType: string;

  @Column({ type: 'jsonb', default: [] })
  conditions: RuleCondition[];

  @Column({ type: 'jsonb', default: [] })
  actions: RuleAction[];

  @Column({ default: true })
  isActive: boolean;

  // Higher runs first (lets a "stop"/override rule win). Default 0.
  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'int', default: 0 })
  fireCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFiredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
