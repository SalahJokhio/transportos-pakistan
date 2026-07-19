import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City, Banner, PlatformSetting } from '../entities/catalog.entity';

const FARE_RULES_KEY = 'fare.rules';
const DEFAULT_FARE_RULES = { minFare: 200, maxFare: 15000, maxSurge: 1.6 };

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
    const row = await this.settingRepo.findOne({ where: { key: FARE_RULES_KEY } });
    if (row) await this.settingRepo.update(row.id, { value });
    else await this.settingRepo.save(this.settingRepo.create({ key: FARE_RULES_KEY, value }));
    return value;
  }
}
