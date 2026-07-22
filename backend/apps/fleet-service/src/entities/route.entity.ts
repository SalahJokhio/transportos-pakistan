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

  // Named boarding / drop-off points the passenger picks at checkout. PK-specific:
  // a route has multiple terminals + landmark pickups, not one origin/destination.
  @Column({ type: 'jsonb', default: [] })
  boardingPoints: Array<{ name: string; city?: string; landmark?: string; time?: string }>;

  @Column({ type: 'jsonb', default: [] })
  droppingPoints: Array<{ name: string; city?: string; landmark?: string }>;

  @Column({ type: 'enum', enum: TransportType, default: TransportType.BUS })
  transportType: TransportType;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
