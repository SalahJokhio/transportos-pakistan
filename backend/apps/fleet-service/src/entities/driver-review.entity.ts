import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A remark/rating left on a driver. Reviews are keyed to the driver's user id
 * (which is tied to their CNIC), so a driver's reputation is portable — it
 * follows them regardless of which company they work for. Any company can pull
 * a driver's record before hiring.
 */
@Entity('driver_reviews')
export class DriverReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  driverId: string;

  // Who left it (a passenger, a company admin, an operator). Nullable so a
  // company can verify + remark without a full account.
  @Column({ nullable: true })
  byUserId: string;

  @Column({ nullable: true })
  byName: string;

  // 1–5 stars.
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  // Optional context: which trip this review is about.
  @Column({ nullable: true })
  tripId: string;

  @CreateDateColumn()
  createdAt: Date;
}
