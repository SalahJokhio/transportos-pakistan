import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface WorkflowHistoryEntry {
  step: number;
  stepName: string;
  action: 'started' | 'approved' | 'rejected';
  by: string;        // userId
  byRole?: string;
  note?: string;
  at: string;        // ISO
}

export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * A live run of a WorkflowDefinition — one purchase/refund/leave request moving
 * through its approval chain. `currentStep` points at the step awaiting action.
 */
@Entity('workflow_instances')
@Index(['companyId', 'status'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  definitionId: string;

  @Column({ nullable: true })
  companyId: string;

  @Column()
  title: string;

  // Optional monetary context (purchase/refund amount) for approver visibility.
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, any>;

  @Column({ default: 'PENDING' })
  status: WorkflowStatus;

  // Index into the definition's steps array that is currently awaiting action.
  @Column({ type: 'int', default: 0 })
  currentStep: number;

  // Snapshot of the definition's steps at start time (so later edits to the
  // template don't rewrite the history of an in-flight instance).
  @Column({ type: 'jsonb', default: [] })
  steps: { name: string; approverRole: string; slaHours?: number }[];

  @Column({ type: 'jsonb', default: [] })
  history: WorkflowHistoryEntry[];

  @Column()
  requestedBy: string; // userId

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
