import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City, Banner, PlatformSetting } from '../entities/catalog.entity';

const FARE_RULES_KEY = 'fare.rules';
const DEFAULT_FARE_RULES = { minFare: 200, maxFare: 15000, maxSurge: 1.6 };

const RBAC_KEY = 'rbac.matrix';
// The capabilities that make up the permission matrix.
export const CAPABILITIES = [
  'manage_users', 'manage_companies', 'manage_catalog', 'manage_compliance',
  'process_refunds', 'manage_settlements', 'manage_coupons', 'send_broadcasts',
  'view_analytics', 'manage_support',
];
// Sensible default role → capability grants.
const DEFAULT_RBAC: Record<string, string[]> = {
  SUPER_ADMIN: [...CAPABILITIES],
  FINANCE_OFFICER: ['process_refunds', 'manage_settlements', 'manage_coupons', 'view_analytics'],
  COMPANY_ADMIN: ['manage_compliance', 'view_analytics', 'manage_coupons'],
  CALL_CENTER_AGENT: ['manage_support'],
};

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
    @InjectRepository(Banner) private readonly bannerRepo: Repository<Banner>,
    @InjectRepository(PlatformSetting) private readonly settingRepo: Repository<PlatformSetting>,
  ) {}

  // ---- Cities -----------------------------------------------------------
  listCities(activeOnly = false) {
    return this.cityRepo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }
  createCity(dto: Partial<City>) {
    return this.cityRepo.save(this.cityRepo.create({ name: (dto.name || '').trim(), province: dto.province, sortOrder: dto.sortOrder ?? 0 }));
  }
  async updateCity(id: string, dto: Partial<City>) {
    await this.cityRepo.update(id, dto);
    return this.cityRepo.findOne({ where: { id } });
  }
  async deleteCity(id: string) {
    await this.cityRepo.delete(id);
    return { deleted: true };
  }

  // ---- Banners ----------------------------------------------------------
  listBanners(placement?: string, activeOnly = false) {
    const where: any = {};
    if (placement) where.placement = placement;
    if (activeOnly) where.isActive = true;
    return this.bannerRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }
  createBanner(dto: Partial<Banner>) {
    return this.bannerRepo.save(this.bannerRepo.create(dto));
  }
  async updateBanner(id: string, dto: Partial<Banner>) {
    await this.bannerRepo.update(id, dto);
    return this.bannerRepo.findOne({ where: { id } });
  }
  async deleteBanner(id: string) {
    await this.bannerRepo.delete(id);
    return { deleted: true };
  }

  // ---- Fare-rule governor ----------------------------------------------
  async getFareRules() {
    const row = await this.settingRepo.findOne({ where: { key: FARE_RULES_KEY } });
    return { ...DEFAULT_FARE_RULES, ...(row?.value ?? {}) };
  }
  async setFareRules(dto: { minFare?: number; maxFare?: number; maxSurge?: number }) {
    const current = await this.getFareRules();
    const value = { ...current, ...dto };
    await this.upsertSetting(FARE_RULES_KEY, value);
    return value;
  }

  // ---- Fraud rules ------------------------------------------------------
  async getFraudRules() {
    const row = await this.settingRepo.findOne({ where: { key: 'fraud.rules' } });
    return { maxCancellations: 3, maxBookingsPerHour: 8, blockedPhones: [] as string[], enabled: true, ...(row?.value ?? {}) };
  }
  async setFraudRules(dto: any) {
    const value = { ...(await this.getFraudRules()), ...dto };
    await this.upsertSetting('fraud.rules', value);
    return value;
  }

  // ---- Support canned replies ------------------------------------------
  async getCannedReplies() {
    const row = await this.settingRepo.findOne({ where: { key: 'support.canned' } });
    return row?.value ?? [
      { title: 'Greeting', body: 'Thank you for contacting TransportOS support. How can we help?' },
      { title: 'Refund in progress', body: 'Your refund has been processed and will reflect in 3-5 working days.' },
      { title: 'Resolved', body: 'This issue is now resolved. Please reach out if you need anything else.' },
    ];
  }
  async setCannedReplies(replies: Array<{ title: string; body: string }>) {
    await this.upsertSetting('support.canned', replies);
    return replies;
  }

  // ---- RBAC permission matrix ------------------------------------------
  async getRbac() {
    const row = await this.settingRepo.findOne({ where: { key: RBAC_KEY } });
    return { capabilities: CAPABILITIES, matrix: row?.value ?? DEFAULT_RBAC };
  }
  async setRbac(matrix: Record<string, string[]>) {
    await this.upsertSetting(RBAC_KEY, matrix);
    return { capabilities: CAPABILITIES, matrix };
  }

  private async upsertSetting(key: string, value: any) {
    const row = await this.settingRepo.findOne({ where: { key } });
    if (row) await this.settingRepo.update(row.id, { value });
    else await this.settingRepo.save(this.settingRepo.create({ key, value }));
  }
}
