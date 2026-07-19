import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** A booking-funnel step event, used to measure where users drop off. */
@Entity('funnel_events')
export class FunnelEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // search | seat_select | pay_start | pay_done
  @Index()
  @Column()
  stage: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  tripId: string;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
