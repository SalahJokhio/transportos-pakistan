import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A passenger-raised dispute — refund request, complaint, or a fraud report —
 * that the admin reviews and resolves. This is the disputes/fraud queue.
 */
@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  bookingId: string;

  @Column({ nullable: true })
  pnr: string;

  // 'REFUND_REQUEST' | 'COMPLAINT' | 'FRAUD'
  @Column()
  type: string;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // 'OPEN' | 'RESOLVED' | 'REJECTED'
  @Index()
  @Column({ default: 'OPEN' })
  status: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
