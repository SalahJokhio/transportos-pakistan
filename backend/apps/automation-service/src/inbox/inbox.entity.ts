import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** An in-app notification for a specific user (the Notification Engine's in-app channel). */
@Entity('inbox_notifications')
@Index(['userId', 'isRead'])
export class InboxNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  // info | success | warning | booking | payment | trip
  @Column({ default: 'info' })
  type: string;

  @Column({ nullable: true })
  link: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
