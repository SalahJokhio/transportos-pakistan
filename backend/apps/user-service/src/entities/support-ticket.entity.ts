import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** A support case (beyond disputes): questions, complaints, requests, with an
 * SLA timer driven by priority and a message thread. */
@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column({ nullable: true })
  category: string;

  // LOW | MEDIUM | HIGH | URGENT
  @Column({ default: 'MEDIUM' })
  priority: string;

  // OPEN | PENDING | RESOLVED | CLOSED
  @Index()
  @Column({ default: 'OPEN' })
  status: string;

  @Column({ nullable: true })
  requesterId: string;

  @Column({ nullable: true })
  requesterName: string;

  @Column({ nullable: true })
  requesterPhone: string;

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ type: 'timestamp', nullable: true })
  firstResponseAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  // CSAT: 1–5 star rating + optional comment, set by the customer after resolution.
  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ nullable: true })
  ratingComment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** One message in a ticket thread (public reply or internal note). */
@Entity('support_messages')
export class SupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  ticketId: string;

  @Column({ nullable: true })
  authorId: string;

  @Column({ nullable: true })
  authorRole: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  isInternal: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
