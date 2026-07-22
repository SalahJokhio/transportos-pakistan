import { Injectable, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/**
 * Digital Twin & Simulation Engine (blueprint's flagship differentiator).
 * "What-if" analysis over the real operation — not live prediction, but
 * scenario projection to support strategic decisions. Every result states its
 * assumptions and is grounded in the operator's actual booking/route data.
 */
@Injectable()
export class SimulationService {
  // Rough operating-cost ratio (fuel+staff+maintenance) as a share of revenue.
  private readonly COST_RATIO = 0.65;
  // Fuel as a share of total operating cost (for fuel-price scenarios).
  private readonly FUEL_SHARE = 0.4;

  constructor(private readonly analytics: AnalyticsService) {}

  private rs(n: number) { return Math.round(n); }

  /** Baseline: recent revenue + top routes from the real data. */
  private async baseline(companyId?: string) {
    const ov = await this.analytics.overview(companyId);
    const revenue = ov.totals.revenue;
    const cost = revenue * this.COST_RATIO;
    return { revenue, cost, profit: revenue - cost, topRoutes: ov.topRoutes, confirmed: ov.totals.confirmed };
  }

  /** Eid / holiday demand spike: bookings × multiplier, capped by capacity note. */
  async demandSpike(multiplier: number, companyId?: string) {
    if (!(multiplier > 0)) throw new BadRequestException('multiplier must be > 0');
    const b = await this.baseline(companyId);
    const projRevenue = b.revenue * multiplier;
    const projProfit = projRevenue - b.revenue * this.COST_RATIO * Math.min(multiplier, 1.4); // costs rise slower (fixed fleet)
    return {
      scenario: 'demand_spike', multiplier,
      assumptions: [`Demand scales ${multiplier}× on existing routes`, 'Fleet capacity fixed — extra demand needs more trips/buses', `Operating cost ratio ${this.COST_RATIO}`],
      baseline: { revenue: this.rs(b.revenue), profit: this.rs(b.profit) },
      projected: { revenue: this.rs(projRevenue), profit: this.rs(projProfit), extraSeatsNeeded: this.rs(b.confirmed * (multiplier - 1)) },
      insight: `At ${multiplier}× demand, revenue ≈ Rs ${this.rs(projRevenue).toLocaleString()} (${multiplier >= 2 ? 'add trips/buses to capture it' : 'largely absorbable'}).`,
      confidence: 'directional',
    };
  }

  /** Fuel price change: impact on profitability. */
  async fuelPrice(pctChange: number, companyId?: string) {
    const b = await this.baseline(companyId);
    const fuelCost = b.cost * this.FUEL_SHARE;
    const newFuelCost = fuelCost * (1 + pctChange / 100);
    const newProfit = b.revenue - (b.cost - fuelCost + newFuelCost);
    return {
      scenario: 'fuel_price', pctChange,
      assumptions: [`Fuel is ${this.FUEL_SHARE * 100}% of operating cost`, 'Fares unchanged (no pass-through)', `Operating cost ratio ${this.COST_RATIO}`],
      baseline: { profit: this.rs(b.profit) },
      projected: { profit: this.rs(newProfit), profitDelta: this.rs(newProfit - b.profit) },
      insight: `A ${pctChange > 0 ? '+' : ''}${pctChange}% fuel move changes profit by Rs ${this.rs(newProfit - b.profit).toLocaleString()}` +
        (newProfit < 0 ? ' — would run at a loss without a fare increase.' : '.'),
      confidence: 'directional',
    };
  }

  /** Route closure (e.g. motorway shut): revenue at risk on a route. */
  async routeClosure(routeMatch: string, companyId?: string) {
    const b = await this.baseline(companyId);
    const hit = b.topRoutes.find((r: any) =>
      `${r.origin}-${r.destination}`.toLowerCase().includes(routeMatch.toLowerCase()) ||
      (r.route || '').toLowerCase().includes(routeMatch.toLowerCase()));
    if (!hit) return { scenario: 'route_closure', routeMatch, insight: `No route matching "${routeMatch}" in the top routes.`, atRisk: 0 };
    return {
      scenario: 'route_closure', route: `${hit.origin}→${hit.destination}`,
      assumptions: ['Route fully suspended for the period', 'No passenger re-accommodation modelled'],
      atRisk: { revenue: this.rs(hit.revenue), bookings: hit.bookings },
      insight: `Closing ${hit.origin}→${hit.destination} puts Rs ${this.rs(hit.revenue).toLocaleString()} (${hit.bookings} bookings) at risk. Consider an alternative-route diversion.`,
      confidence: 'grounded',
    };
  }

  /** New-route launch: project demand from the closest comparable route. */
  async newRoute(price: number, companyId?: string) {
    const b = await this.baseline(companyId);
    const avg = b.topRoutes.length
      ? b.topRoutes.reduce((s: number, r: any) => s + r.bookings, 0) / b.topRoutes.length
      : 0;
    // New routes typically ramp to ~40% of an established comparable in month 1.
    const projBookings = Math.round(avg * 0.4);
    return {
      scenario: 'new_route', price,
      assumptions: ['Month-1 demand ≈ 40% of an average existing route', `Fare Rs ${price}`],
      projected: { monthOneBookings: projBookings, monthOneRevenue: this.rs(projBookings * price) },
      insight: `A new route at Rs ${price} would likely see ~${projBookings} bookings in month 1 (≈ Rs ${this.rs(projBookings * price).toLocaleString()}), ramping thereafter.`,
      confidence: 'directional',
    };
  }

  async run(scenario: string, params: any, companyId?: string) {
    switch (scenario) {
      case 'demand_spike': return this.demandSpike(Number(params?.multiplier ?? 2), companyId);
      case 'fuel_price': return this.fuelPrice(Number(params?.pctChange ?? 15), companyId);
      case 'route_closure': return this.routeClosure(String(params?.route ?? ''), companyId);
      case 'new_route': return this.newRoute(Number(params?.price ?? 1500), companyId);
      default: throw new BadRequestException('Unknown scenario');
    }
  }
}
