/// <reference types="jest" />
import { PricingService } from '../../src/services/pricing.service';

/**
 * Pricing is pure arithmetic but it decides what a passenger is charged, so the
 * GST rate, the multi-seat multiplication and the rounding all need pinning.
 */
describe('PricingService', () => {
  const pricing = new PricingService();

  it('multiplies base fare by seat count for the subtotal', () => {
    const p = pricing.calculate(1000, 3);
    expect(p.subtotal).toBe(3000);
    expect(p.seats).toBe(3);
  });

  it('adds 16% Pakistan GST on top of the discounted subtotal', () => {
    const p = pricing.calculate(1000, 1);
    // 1000 subtotal, no discount → tax = 160, total = 1160
    expect(p.taxes).toBe(160);
    expect(p.total).toBe(1160);
  });

  it('applies a promo discount before tax, then rounds the total', () => {
    const p = pricing.calculate(1000, 2, 10); // 2000 subtotal, 10% off
    expect(p.discount).toBe(200);
    // taxed base = 1800, tax = 288, total = 2088
    expect(p.total).toBe(2088);
  });

  it('rounds the final total to a whole rupee', () => {
    const p = pricing.calculate(333, 1); // 333 + 16% = 386.28 → 386
    expect(Number.isInteger(p.total)).toBe(true);
    expect(p.total).toBe(386);
  });

  it('handles a zero-seat request without throwing', () => {
    const p = pricing.calculate(1000, 0);
    expect(p.subtotal).toBe(0);
    expect(p.total).toBe(0);
  });
});
