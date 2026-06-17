import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TripStatus } from '@app/common';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  routeId: string;

  @Column()
  busId: string;

  @Column()
  companyId: string;

  @Column()
  driverId: string;

  @Column()
  departureTime: Date;

  @Column()
  estimatedArrivalTime: Date;

  @Column({ nullable: true })
  actualDepartureTime: Date;

  @Column({ nullable: true })
  actualArrivalTime: Date;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.SCHEDULED })
  status: TripStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'jsonb', default: {} })
  seatAvailability: Record<string, 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'BLOCKED'>;

  @Column({ nullable: true })
  delayMinutes: number;

  @Column({ nullable: true })
  delayReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
