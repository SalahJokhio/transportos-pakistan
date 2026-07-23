import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * AI Governance feedback loop (blueprint line 1233): every accepted/rejected AI
 * suggestion is logged so we can measure and improve suggestion quality.
 */
@Entity('ai_feedback')
@Index(['kind', 'createdAt'])
export class AiFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  // agent_insight | copilot_answer | dispatch_decision | prediction | …
  @Column()
  kind: string;

  @Column({ nullable: true })
  refId: string;

  @Column()
  accepted: boolean;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
