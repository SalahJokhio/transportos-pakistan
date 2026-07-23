import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A knowledge-base article — SOP, policy, manual, or FAQ. The Copilot retrieves
 * relevant articles to ground answers on company knowledge, not just live data.
 */
@Entity('kb_articles')
@Index(['companyId', 'category'])
export class KbArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Null = platform-wide knowledge available to every tenant.
  @Column({ nullable: true })
  companyId: string;

  @Column()
  title: string;

  // SOP | POLICY | MANUAL | FAQ | COMPLIANCE
  @Column({ default: 'SOP' })
  category: string;

  @Column({ type: 'text' })
  body: string;

  // Comma-free keyword list for lightweight retrieval boosting.
  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
