import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A time-bound compliance document attached to a company, driver/employee or
 * bus — route permits, vehicle fitness certificates, insurance, driver licences,
 * CNICs. The `expiresAt` date drives the expiry-alert dashboard so nothing
 * lapses unnoticed (a expired route-permit/fitness cert is a legal + safety risk).
 */
@Entity('compliance_documents')
@Index(['ownerType', 'ownerId'])
export class ComplianceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // COMPANY | DRIVER | EMPLOYEE | BUS
  @Column()
  ownerType: string;

  @Column()
  ownerId: string;

  // Free label of who it belongs to (bus reg no, driver name, company name).
  @Column({ nullable: true })
  ownerLabel: string;

  // ROUTE_PERMIT | FITNESS_CERT | INSURANCE | LICENCE | CNIC | REGISTRATION | NTN | MEDICAL
  @Column()
  docType: string;

  @Column({ nullable: true })
  number: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ type: 'date', nullable: true })
  issuedAt: string;

  @Index()
  @Column({ type: 'date', nullable: true })
  expiresAt: string;

  // PENDING_REVIEW | VERIFIED | REJECTED
  @Column({ default: 'PENDING_REVIEW' })
  status: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
