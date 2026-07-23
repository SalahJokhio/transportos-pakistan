import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** A saved traveller (self/family/friend) for faster booking. */
@Entity('saved_travelers')
@Index(['userId'])
export class SavedTraveler {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  relationship: string; // Self | Family | Friend | Child | Parent

  @Column({ nullable: true })
  cnic: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ nullable: true })
  seatPreference: string; // Window | Aisle

  @CreateDateColumn()
  createdAt: Date;
}

/** A saved address (home/office/pickup). */
@Entity('saved_addresses')
@Index(['userId'])
export class SavedAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  label: string; // Home | Office | …

  @Column({ nullable: true })
  line: string;

  @Column({ nullable: true })
  area: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'double precision', nullable: true })
  lat: number;

  @Column({ type: 'double precision', nullable: true })
  lng: number;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

/** Per-user notification preferences (category × channel toggles). */
@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  userId: string;

  // { booking: {push,sms,email,whatsapp}, payments: {...}, marketing: {...}, ... }
  @Column({ type: 'jsonb', default: {} })
  prefs: Record<string, Record<string, boolean>>;

  @UpdateDateColumn()
  updatedAt: Date;
}
