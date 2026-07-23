import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A configurable scheduled automation (blueprint Scheduling + Automation
 * engines, lines 648/804). A cron dispatcher runs active jobs when they're due.
 */
@Entity('scheduled_jobs')
@Index(['isActive'])
export class ScheduledJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyId: string;

  @Column()
  name: string;

  // CLEANUP_EVENTS | TICKET_EXPIRY | FORECAST_SNAPSHOT | PAYROLL_REMINDER
  @Column()
  jobType: string;

  // HOURLY | DAILY | WEEKLY
  @Column({ default: 'DAILY' })
  frequency: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ nullable: true })
  lastResult: string;

  @CreateDateColumn()
  createdAt: Date;
}
