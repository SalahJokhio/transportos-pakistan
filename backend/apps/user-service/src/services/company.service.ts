import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CompanyProfile } from '../entities/company-profile.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { UserRole } from '@app/common';

// Default usage limits per subscription plan (a profile can override with a
// positive maxBuses/maxRoutes value).
const PLAN_LIMITS: Record<string, { maxBuses: number; maxRoutes: number }> = {
  FREE: { maxBuses: 3, maxRoutes: 3 },
  STARTER: { maxBuses: 15, maxRoutes: 20 },
  PRO: { maxBuses: 60, maxRoutes: 100 },
  ENTERPRISE: { maxBuses: 100000, maxRoutes: 100000 },
};

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(CompanyProfile) private readonly profileRepo: Repository<CompanyProfile>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
  ) {}

  private effectiveLimits(p: CompanyProfile) {
    const plan = PLAN_LIMITS[p.plan] ?? PLAN_LIMITS.FREE;
    return {
      maxBuses: p.maxBuses > 0 ? p.maxBuses : plan.maxBuses,
      maxRoutes: p.maxRoutes > 0 ? p.maxRoutes : plan.maxRoutes,
    };
  }

  /** Get the tenant profile, creating a default row on first access. */
  async getOrCreate(companyId: string, name?: string): Promise<CompanyProfile> {
    let profile = await this.profileRepo.findOne({ where: { companyId } });
    if (!profile) {
      profile = await this.profileRepo.save(this.profileRepo.create({ companyId, name: name ?? 'Operator' }));
    }
    return profile;
  }

  /** All operators with their plan, status, limits and live usage. */
  async list() {
    const operators = await this.userRepo.find({ where: { role: UserRole.COMPANY_ADMIN }, order: { createdAt: 'DESC' } });
    const out = [];
    for (const op of operators) {
      const profile = await this.getOrCreate(op.id, `${op.firstName ?? ''} ${op.lastName ?? ''}`.trim() || 'Operator');
      const busCount = await this.busRepo.count({ where: { companyId: op.id } });
      const limits = this.effectiveLimits(profile);
      out.push({
        companyId: op.id,
        name: profile.name,
        plan: profile.plan,
        status: profile.status,
        limits,
        usage: { buses: busCount },
        branding: { primaryColor: profile.primaryColor, logoUrl: profile.logoUrl },
        operator: { name: `${op.firstName ?? ''} ${op.lastName ?? ''}`.trim(), phone: op.phone, isActive: op.isActive },
      });
    }
    return out;
  }

  async update(companyId: string, dto: Partial<CompanyProfile>) {
    await this.getOrCreate(companyId);
    const allowed: Partial<CompanyProfile> = {
      name: dto.name,
      plan: dto.plan,
      maxBuses: dto.maxBuses,
      maxRoutes: dto.maxRoutes,
      primaryColor: dto.primaryColor,
      logoUrl: dto.logoUrl,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
    };
    // Drop undefined so a partial update doesn't null existing fields.
    Object.keys(allowed).forEach((k) => (allowed as any)[k] === undefined && delete (allowed as any)[k]);
    await this.profileRepo.update({ companyId }, allowed);
    return this.profileRepo.findOne({ where: { companyId } });
  }

  /** Suspend the tenant AND block the operator's login (isActive=false). */
  async setSuspended(companyId: string, suspended: boolean) {
    const profile = await this.getOrCreate(companyId);
    await this.profileRepo.update({ companyId }, { status: suspended ? 'SUSPENDED' : 'ACTIVE' });
    await this.userRepo.update({ id: companyId }, { isActive: !suspended });
    return { companyId, status: suspended ? 'SUSPENDED' : 'ACTIVE' };
  }

  /** Enforcement hook used by the fleet service before creating a bus. */
  async canAddBus(companyId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
    const profile = await this.profileRepo.findOne({ where: { companyId } });
    // No profile yet → treat as default plan limits.
    const limit = this.effectiveLimits(profile ?? ({ plan: 'FREE', maxBuses: 0, maxRoutes: 0 } as CompanyProfile)).maxBuses;
    const used = await this.busRepo.count({ where: { companyId } });
    return { allowed: used < limit, used, limit };
  }
}
