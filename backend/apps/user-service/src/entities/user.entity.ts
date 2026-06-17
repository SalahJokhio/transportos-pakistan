import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, OneToMany,
} from 'typeorm';
import { UserRole } from '@app/common';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  email: string;

  @Index({ unique: true })
  @Column()
  phone: string;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PASSENGER })
  role: UserRole;

  @Column({ nullable: true })
  cnic: string;

  @Column({ nullable: true })
  profilePhoto: string;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ default: 0 })
  loyaltyPoints: number;

  @Column({ nullable: true })
  companyId: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    language: string;
    notifications: { sms: boolean; email: boolean; push: boolean };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
}
