import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** An immutable record of a privileged admin action (who did what, to whom, when). */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  actorRole: string;

  // e.g. "POST /admin/companies/:id/suspend"
  @Column()
  action: string;

  @Column({ nullable: true })
  targetId: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: any;

  @Column({ nullable: true })
  ip: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
