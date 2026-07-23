import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** A lost-item report raised by a passenger (Help Center → Lost & Found). */
@Entity('lost_items')
@Index(['userId'])
export class LostItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  companyId: string;

  @Column({ nullable: true })
  pnr: string;

  @Column()
  itemName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  seat: string;

  @Column({ nullable: true })
  contactPhone: string;

  // REPORTED | SEARCHING | FOUND | RETURNED | NOT_FOUND | CLOSED
  @Column({ default: 'REPORTED' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

/** An emergency SOS raised during/around a trip (Help Center → Emergency). */
@Entity('sos_events')
@Index(['status'])
export class SosEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  tripId: string;

  // MEDICAL | SECURITY | ACCIDENT | HARASSMENT | BREAKDOWN | FIRE | SOS
  @Column({ default: 'SOS' })
  type: string;

  @Column({ type: 'double precision', nullable: true })
  lat: number;

  @Column({ type: 'double precision', nullable: true })
  lng: number;

  @Column({ nullable: true })
  note: string;

  // ACTIVE | ACKNOWLEDGED | RESOLVED
  @Column({ default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
