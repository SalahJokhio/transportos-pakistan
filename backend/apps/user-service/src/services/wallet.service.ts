import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';

const POINT_TO_RUPEE = 1; // 1 loyalty point = Rs 1 when redeemed

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(WalletTransaction) private readonly txRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async getWallet(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const transactions = await this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return {
      balance: Number(user.walletBalance ?? 0),
      loyaltyPoints: user.loyaltyPoints ?? 0,
      transactions,
    };
  }

  /** Add money to the wallet (a real gateway top-up would settle this). */
  async topup(userId: string, amount: number) {
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new BadRequestException('Amount must be positive');
    return this.move(userId, amt, 'TOPUP', 'Wallet top-up');
  }

  /** Convert loyalty points into wallet credit (1 pt = Rs 1). */
  async redeemPoints(userId: string, points: number) {
    const pts = Math.floor(Number(points));
    if (!pts || pts <= 0) throw new BadRequestException('Points must be positive');
    return this.dataSource.transaction(async (em) => {
      const user = await em.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if ((user.loyaltyPoints ?? 0) < pts) throw new BadRequestException('Not enough points');
      await em.decrement(User, { id: userId }, 'loyaltyPoints', pts);
      return this.applyDelta(em, userId, pts * POINT_TO_RUPEE, 'POINTS_REDEEM', `Redeemed ${pts} points`);
    });
  }

  /** Debit for a booking. Throws if the balance is insufficient. */
  async debit(userId: string, amount: number, opts: { description?: string; bookingId?: string } = {}) {
    const amt = Number(amount);
    return this.dataSource.transaction(async (em) => {
      const user = await em.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (Number(user.walletBalance ?? 0) < amt) throw new BadRequestException('Insufficient wallet balance');
      return this.applyDelta(em, userId, -amt, 'PAYMENT', opts.description ?? 'Ticket payment', opts.bookingId);
    });
  }

  /** Credit money back to the wallet (e.g. a refund on cancellation). */
  async credit(userId: string, amount: number, opts: { description?: string; bookingId?: string } = {}) {
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new BadRequestException('Amount must be positive');
    return this.dataSource.transaction((em) =>
      this.applyDelta(em, userId, amt, 'REFUND', opts.description ?? 'Refund', opts.bookingId),
    );
  }

  private async move(userId: string, delta: number, type: string, description: string) {
    return this.dataSource.transaction((em) => this.applyDelta(em, userId, delta, type, description));
  }

  private async applyDelta(em: any, userId: string, delta: number, type: string, description: string, bookingId?: string) {
    if (delta >= 0) await em.increment(User, { id: userId }, 'walletBalance', delta);
    else await em.decrement(User, { id: userId }, 'walletBalance', -delta);
    const user = await em.findOne(User, { where: { id: userId } });
    const balanceAfter = Number(user.walletBalance ?? 0);
    await em.save(WalletTransaction, em.create(WalletTransaction, {
      userId,
      type,
      amount: delta,
      balanceAfter,
      description,
      bookingId: bookingId ?? null,
    }));
    return { balance: balanceAfter, amount: delta, type };
  }
}
