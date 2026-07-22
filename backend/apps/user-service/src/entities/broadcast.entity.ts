import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** A message blast to a user segment (SMS/WhatsApp/push/email). */
@Entity('broadcasts')
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text' })
  message: string;

  // SMS | WHATSAPP | PUSH | EMAIL
  @Column({ default: 'SMS' })
  channel: string;

  // ALL | PASSENGER | DRIVER | COMPANY_ADMIN | BOOKING_AGENT ...
  @Column({ default: 'ALL' })
  segment: string;

  @Column({ type: 'int', default: 0 })
  recipientCount: number;

  // SENT | FAILED
  @Column({ default: 'SENT' })
  status: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
