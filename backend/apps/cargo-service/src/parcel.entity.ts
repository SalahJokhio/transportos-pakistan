import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** A parcel/cargo shipment carried on the operator's buses. */
@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  trackingNo: string;

  @Column() senderName: string;
  @Column({ nullable: true }) senderPhone: string;
  @Column() receiverName: string;
  @Column({ nullable: true }) receiverPhone: string;

  @Column() originCity: string;
  @Column() destinationCity: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  weightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  // BOOKED | IN_TRANSIT | ARRIVED | DELIVERED
  @Index()
  @Column({ default: 'BOOKED' })
  status: string;

  @Column({ nullable: true }) companyId: string;
  @Column({ nullable: true }) tripId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
