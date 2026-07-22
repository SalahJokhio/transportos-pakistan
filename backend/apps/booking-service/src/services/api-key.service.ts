import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyService {
  constructor(@InjectRepository(ApiKey) private readonly repo: Repository<ApiKey>) {}

  async create(companyId: string, name?: string) {
    const key = 'tos_' + crypto.randomBytes(24).toString('hex');
    return this.repo.save(this.repo.create({ key, companyId, name: name || 'Partner key' }));
  }

  list(companyId: string) {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async revoke(id: string, companyId: string) {
    await this.repo.update({ id, companyId }, { isActive: false });
    return { revoked: true };
  }

  /** Resolve an X-API-Key header to a company; stamps lastUsedAt. */
  async validate(key: string): Promise<{ companyId?: string } | null> {
    if (!key) return null;
    const row = await this.repo.findOne({ where: { key, isActive: true } });
    if (!row) return null;
    this.repo.update(row.id, { lastUsedAt: new Date() }).catch(() => undefined);
    return { companyId: row.companyId };
  }
}
