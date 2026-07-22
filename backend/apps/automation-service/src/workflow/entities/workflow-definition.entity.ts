import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export interface WorkflowStep {
  name: string;          // "Supervisor review"
  approverRole: string;  // role that can approve this step, e.g. COMPANY_ADMIN / FINANCE_OFFICER
  slaHours?: number;     // optional soft SLA for the step (surfaced, not enforced yet)
}

/**
 * A reusable approval-chain template. e.g. a "Purchase Request" flows through
 * Supervisor → Finance → CEO. Each step names the role allowed to approve it.
 * This is the configurable Approval Engine from the enterprise blueprint.
 */
@Entity('workflow_definitions')
@Index(['companyId', 'isActive'])
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Null = platform-wide template usable by any tenant.
  @Column({ nullable: true })
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Free-form grouping: PURCHASE | REFUND | LEAVE | MAINTENANCE | …
  @Column({ default: 'GENERAL' })
  category: string;

  @Column({ type: 'jsonb', default: [] })
  steps: WorkflowStep[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
