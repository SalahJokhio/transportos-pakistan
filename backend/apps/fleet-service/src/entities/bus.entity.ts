import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BusType {
  AC = 'AC',
  NON_AC = 'NON_AC',
  SLEEPER = 'SLEEPER',
  BUSINESS = 'BUSINESS',
  MINIBUS = 'MINIBUS',
}

@Entity('buses')
export class Bus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  registrationNumber: string;

  @Column()
  companyId: string;

  @Column({ type: 'enum', enum: BusType, default: BusType.AC })
  busType: BusType;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column({ type: 'int' })
  manufacturingYear: number;

  @Column({ type: 'int' })
  totalSeats: number;

  @Column({ type: 'jsonb' })
  seatLayout: {
    rows: number;
    seatsPerRow: number;
    layout: Array<{ seatNumber: string; row: number; col: number; type: 'regular' | 'window' | 'aisle' }>;
  };

  @Column({ nullable: true })
  amenities: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  currentDriverId: string;

  @Column({ nullable: true })
  lastMaintenanceDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
