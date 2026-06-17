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
