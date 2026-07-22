import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Policy } from './policy.entity';
import { EventBusService } from '../services/event-bus.service';

/** Platform-wide sensible defaults; a company overrides any subset. */
const DEFAULTS: Record<string, number> = {
  maxWorkingHours: 10,     // per driver per day
  minRestHours: 8,         // between shifts
  maxRefundPct: 100,       // cap on cancellation refund
  fuelLimitPerTrip: 15000, // Rs, above which fuel spend is flagged
  speedLimitKmh: 100,      // motorway limit
  lateArrivalGraceMin: 20, // minutes late before it's a violation
};

// check-type → { policy key, direction } ('max' = value must be ≤ limit; 'min' = value must be ≥ limit)
const CHECKS: Record<string, { key: string; dir: 'max' | 'min'; label: string }> = {
  working_hours: { key: 'maxWorkingHours', dir: 'max', label: 'Working hours' },
  rest_hours: { key: 'minRestHours', dir: 'min', label: 'Rest hours' },
  refund_pct: { key: 'maxRefundPct', dir: 'max', label: 'Refund %' },
  fuel: { key: 'fuelLimitPerTrip', dir: 'max', label: 'Fuel spend' },
  speed: { key: 'speedLimitKmh', dir: 'max', label: 'Speed' },
  late_arrival: { key: 'lateArrivalGraceMin', dir: 'max', label: 'Late arrival (min)' },
};

/** The Policy Engine: configurable operating limits + violation checks. */
@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Policy) private readonly repo: Repository<Policy>,
    private readonly eventBus: EventBusService,
  ) {}

  async get(companyId: string | null): Promise<Record<string, number>> {
    const [platform, own] = await Promise.all([
      this.repo.findOne({ where: { companyId: IsNull() } }),
      companyId ? this.repo.findOne({ where: { companyId } }) : Promise.resolve(null),
    ]);
    return { ...DEFAULTS, ...(platform?.values ?? {}), ...(own?.values ?? {}) };
  }

  async update(companyId: string | null, patch: Record<string, number>) {
    // Keep only known numeric keys.
    const clean: Record<string, number> = {};
    for (const k of Object.keys(DEFAULTS)) if (patch[k] != null && !isNaN(Number(patch[k]))) clean[k] = Number(patch[k]);
    let row = await this.repo.findOne({ where: companyId ? { companyId } : { companyId: IsNull() } });
    if (!row) row = this.repo.create({ companyId: companyId ?? null, values: {} });
    row.values = { ...row.values, ...clean };
    await this.repo.save(row);
    return this.get(companyId);
  }

  /** Check a measured value against the relevant policy; emits POLICY_VIOLATION on breach. */
  async check(companyId: string | null, type: string, value: number, context?: any) {
    const spec = CHECKS[type];
    if (!spec) return { allowed: true, message: 'No policy for this check type' };
    const limits = await this.get(companyId);
    const limit = limits[spec.key];
    const violated = spec.dir === 'max' ? Number(value) > limit : Number(value) < limit;
    if (!violated) return { allowed: true, type, limit, value };

    const message = `${spec.label} ${value} ${spec.dir === 'max' ? 'exceeds max' : 'below min'} ${limit}`;
    this.eventBus.emit('POLICY_VIOLATION', { type, policy: spec.key, limit, value, message, context },
      { companyId, source: 'policy' }).catch(() => undefined);
    return { allowed: false, type, limit, value, message };
  }

  defaults() { return DEFAULTS; }
}
