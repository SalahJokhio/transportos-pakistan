import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-tenant settings for an operator company. Keyed by `companyId` (which is
 * the operator's user id in the current model), so it layers on top of the
 * existing data without a disruptive refactor. Holds the subscription plan,
 * usage limits, branding, and suspend state.
 */
@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  companyId: string;

  @Column({ nullable: true })
  name: string;

  // FREE | STARTER | PRO | ENTERPRISE
  @Column({ default: 'FREE' })
  plan: string;

  // ACTIVE | SUSPENDED
  @Column({ default: 'ACTIVE' })
  status: string;

  // 0 = use the plan default; a positive value overrides it.
  @Column({ type: 'int', default: 0 })
  maxBuses: number;

  @Column({ type: 'int', default: 0 })
  maxRoutes: number;

  // Branding
  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
