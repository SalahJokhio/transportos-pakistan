import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
}

@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: LoyaltyTransactionType })
  type: LoyaltyTransactionType;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ nullable: true })
  bookingId: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
