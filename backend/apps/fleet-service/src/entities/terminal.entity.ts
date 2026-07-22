import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** An operator's named terminal / boarding point in a city (a reusable directory). */
@Entity('terminals')
@Index(['companyId', 'city'])
export class Terminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  city: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  landmark: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
