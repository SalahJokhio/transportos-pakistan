import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum EmployeeType {
  DRIVER = 'DRIVER',
  CONDUCTOR = 'CONDUCTOR',
  MECHANIC = 'MECHANIC',
  TECHNICIAN = 'TECHNICIAN',
  BOOKING_AGENT = 'BOOKING_AGENT',
  TERMINAL_MANAGER = 'TERMINAL_MANAGER',
  CLEANER = 'CLEANER',
  SECURITY = 'SECURITY',
  ACCOUNTANT = 'ACCOUNTANT',
  DISPATCHER = 'DISPATCHER',
}

export enum EmployeeStatus {
  ON_DUTY = 'ON_DUTY',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

@Entity('employees')
@Index(['companyId', 'employeeType'])
@Index(['companyId', 'status'])
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Column({ type: 'enum', enum: EmployeeType })
  employeeType: EmployeeType;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Index()
  @Column({ nullable: true })
  cnic: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  nextOfKin: string;

  @Column({ nullable: true })
  depot: string;

  @Column({ type: 'date', nullable: true })
  joinDate: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salary: number;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ON_DUTY })
  status: EmployeeStatus;

  @Column({ nullable: true })
  photoUrl: string;

  // { license?: {number, expiry}, medical?: {expiry}, other?: [{name,url}] }
  @Column({ type: 'jsonb', nullable: true })
  documents: any;

  @Column({ type: 'float', default: 0 })
  rating: number;

  // optional link to a login User (drivers/agents who use the apps)
  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
