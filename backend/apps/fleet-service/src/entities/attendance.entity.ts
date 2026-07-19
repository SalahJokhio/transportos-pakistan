import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** A staff attendance record for one employee on one day. */
@Entity('attendance')
@Index(['companyId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  employeeId: string;

  @Column()
  companyId: string;

  @Column({ type: 'date' })
  date: string;

  // PRESENT | ABSENT | LEAVE | HALF_DAY
  @Column({ default: 'PRESENT' })
  status: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
