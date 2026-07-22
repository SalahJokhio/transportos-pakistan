import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Output of an `alert` rule action — an in-app notification surfaced in the
 * admin/operator console (the Automation Engine's visible side-effect).
 */
@Entity('automation_alerts')
@Index(['companyId', 'isRead'])
export class AutomationAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyId: string;

  @Column({ nullable: true })
  ruleId: string;

  @Column({ default: 'info' })
  severity: 'info' | 'warning' | 'critical';

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
