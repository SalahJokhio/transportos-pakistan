import { Injectable } from '@nestjs/common';

export interface PriceCalculation {
  basePrice: number;
  seats: number;
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
}

@Injectable()
export class PricingService {
  calculate(basePrice: number, seats: number, promoDiscount = 0): PriceCalculation {
    const subtotal = basePrice * seats;
    const discount = subtotal * (promoDiscount / 100);
    const taxes = (subtotal - discount) * 0.16; // 16% GST Pakistan
    const total = subtotal - discount + taxes;
    return { basePrice, seats, subtotal, discount, taxes, total: Math.round(total) };
  }
}
