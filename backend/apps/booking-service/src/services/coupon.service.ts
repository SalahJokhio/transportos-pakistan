import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';

export interface CouponResult {
  valid: boolean;
  discount: number;
  code?: string;
  message?: string;
}

/** Promo-code validation, discount calc, and atomic redemption. */
@Injectable()
export class CouponService {
  constructor(@InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>) {}

  /** Validate a code against a subtotal and return the discount it would give. */
  async validate(rawCode: string, subtotal: number): Promise<CouponResult> {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return { valid: false, discount: 0, message: 'No code entered' };

    const c = await this.couponRepo.findOne({ where: { code } });
    if (!c || !c.isActive) return { valid: false, discount: 0, message: 'Invalid code' };
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { valid: false, discount: 0, message: 'Code expired' };
    if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { valid: false, discount: 0, message: 'Code fully redeemed' };
    if (subtotal < Number(c.minAmount)) {
      return { valid: false, discount: 0, message: `Minimum spend Rs ${c.minAmount}` };
    }

    let discount = c.type === 'FLAT'
      ? Number(c.value)
      : (subtotal * Number(c.value)) / 100;
    if (c.type === 'PERCENT' && c.maxDiscount) discount = Math.min(discount, Number(c.maxDiscount));
    discount = Math.min(Math.round(discount), subtotal); // never exceed the subtotal

    return { valid: true, discount, code };
  }

  /** Atomically count a redemption (call after the booking is saved). */
  async redeem(code: string): Promise<void> {
    await this.couponRepo.increment({ code: code.trim().toUpperCase() }, 'usedCount', 1);
  }

  async create(dto: Partial<Coupon>): Promise<Coupon> {
    if (!dto.code || dto.value == null) throw new BadRequestException('code and value are required');
    const coupon = this.couponRepo.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
      type: dto.type === 'FLAT' ? 'FLAT' : 'PERCENT',
    });
    return this.couponRepo.save(coupon);
  }

  list(): Promise<Coupon[]> {
    return this.couponRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }
}
