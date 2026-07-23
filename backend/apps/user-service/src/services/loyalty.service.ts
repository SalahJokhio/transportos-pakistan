import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LoyaltyTransaction, LoyaltyTransactionType } from '../entities/loyalty-transaction.entity';
import { User } from '../entities/user.entity';

// 1 point per Rs 10 spent
const POINTS_PER_RUPEE = 1 / 10;
// Each point is worth Rs 0.50 when redeemed
const RUPEES_PER_POINT = 0.5;

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransaction)
    private readonly txRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /** Membership tier from lifetime points earned + progress to the next tier. */
  async tier(userId: string) {
    const TIERS = [
      { name: 'Bronze', min: 0, multiplier: 1, benefits: ['Earn 1 pt / Rs 10', 'Standard support'] },
      { name: 'Silver', min: 2000, multiplier: 1.25, benefits: ['1.25× points', 'Priority support', 'Early-bird offers'] },
      { name: 'Gold', min: 5000, multiplier: 1.5, benefits: ['1.5× points', 'Free seat selection', 'Priority boarding', 'Exclusive deals'] },
      { name: 'Platinum', min: 15000, multiplier: 2, benefits: ['2× points', 'Dedicated support line', 'Free cancellation', 'Lounge access (where available)'] },
    ];
    const row = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.points),0)', 'earned')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type: LoyaltyTransactionType.EARN })
      .getRawOne();
    const lifetime = Math.max(0, Number(row?.earned) || 0);
    const user = await this.userRepo.findOne({ where: { id: userId } });

    let idx = 0;
    for (let i = TIERS.length - 1; i >= 0; i--) if (lifetime >= TIERS[i].min) { idx = i; break; }
    const current = TIERS[idx];
    const next = TIERS[idx + 1] ?? null;
    const progress = next ? Math.min(100, Math.round(((lifetime - current.min) / (next.min - current.min)) * 100)) : 100;

    return {
      tier: current.name,
      multiplier: current.multiplier,
      benefits: current.benefits,
      pointsBalance: user?.loyaltyPoints ?? 0,
      lifetimePoints: lifetime,
      nextTier: next?.name ?? null,
      pointsToNext: next ? Math.max(0, next.min - lifetime) : 0,
      progress,
      allTiers: TIERS.map((t) => ({ name: t.name, min: t.min })),
    };
  }

  async earnFromBooking(userId: string, amountPaid: number, bookingId: string): Promise<LoyaltyTransaction> {
    const points = Math.floor(amountPaid * POINTS_PER_RUPEE);
    if (points <= 0) return null;
    return this.addPoints(userId, points, LoyaltyTransactionType.EARN, bookingId, `Earned ${points} pts on booking`);
  }

  async addPoints(
    userId: string,
    points: number,
    type: LoyaltyTransactionType,
    bookingId?: string,
    description?: string,
  ): Promise<LoyaltyTransaction> {
    return this.dataSource.transaction(async (em) => {
      await em.increment(User, { id: userId }, 'loyaltyPoints', points);
      const user = await em.findOne(User, { where: { id: userId } });
      const tx = em.create(LoyaltyTransaction, {
        userId,
        type,
        points,
        balanceAfter: user.loyaltyPoints,
        bookingId,
        description,
      });
      return em.save(tx);
    });
  }

  async redeemPoints(userId: string, points: number, bookingId?: string): Promise<{ rupeesValue: number; tx: LoyaltyTransaction }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.loyaltyPoints < points) {
      throw new BadRequestException('Insufficient loyalty points');
    }

    const tx = await this.dataSource.transaction(async (em) => {
      await em.decrement(User, { id: userId }, 'loyaltyPoints', points);
      const updated = await em.findOne(User, { where: { id: userId } });
      const transaction = em.create(LoyaltyTransaction, {
        userId,
        type: LoyaltyTransactionType.REDEEM,
        points: -points,
        balanceAfter: updated.loyaltyPoints,
        bookingId,
        description: `Redeemed ${points} pts (Rs ${(points * RUPEES_PER_POINT).toFixed(0)})`,
      });
      return em.save(transaction);
    });

    return { rupeesValue: points * RUPEES_PER_POINT, tx };
  }

  async getBalance(userId: string): Promise<{ points: number; rupeeValue: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const points = user?.loyaltyPoints ?? 0;
    return { points, rupeeValue: points * RUPEES_PER_POINT };
  }

  async getHistory(userId: string, page = 1, limit = 20): Promise<{ data: LoyaltyTransaction[]; total: number; balance: number }> {
    const [data, total] = await this.txRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return { data, total, balance: user?.loyaltyPoints ?? 0 };
  }
}
