import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** A booking-counter agent's cash shift — opened, then closed with reconciliation. */
@Entity('agent_shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  agentId: string;

  @Column({ nullable: true })
  companyId: string;

  // OPEN | CLOSED
  @Column({ default: 'OPEN' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingCash: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  closingCash: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashCollected: number;

  @Column({ type: 'int', default: 0 })
  bookingsCount: number;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  openedAt: Date;
}
