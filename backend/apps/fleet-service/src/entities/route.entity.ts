import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TransportType } from '@app/common';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  originCity: string;

  @Column()
  destinationCity: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distanceKm: number;

  @Column({ type: 'int' })
  estimatedMinutes: number;

  @Column({ type: 'jsonb', default: [] })
  stops: Array<{
    city: string;
    stopName: string;
    order: number;
    distanceFromOriginKm: number;
    minutesFromOrigin: number;
  }>;

  @Column({ type: 'enum', enum: TransportType, default: TransportType.BUS })
  transportType: TransportType;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
