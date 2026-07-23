import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** One record per login attempt, for the Security Center's login history. */
@Entity('login_history')
@Index(['userId'])
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'SUCCESS' })
  status: string; // SUCCESS | FAILED | BLOCKED

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  device: string; // user-agent (trimmed)

  @CreateDateColumn()
  createdAt: Date;
}
