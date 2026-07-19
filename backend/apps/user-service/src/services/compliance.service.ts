import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ComplianceDocument } from '../entities/compliance-document.entity';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceDocument) private readonly docRepo: Repository<ComplianceDocument>,
  ) {}

  /** Days until expiry (negative = already expired), or null if no expiry. */
  private daysLeft(expiresAt?: string): number | null {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  }

  private decorate(d: ComplianceDocument) {
    const daysLeft = this.daysLeft(d.expiresAt);
    const expiry = daysLeft == null ? 'NONE' : daysLeft < 0 ? 'EXPIRED' : daysLeft <= 30 ? 'EXPIRING' : 'OK';
    return { ...d, daysLeft, expiry };
  }

  create(dto: Partial<ComplianceDocument>) {
    return this.docRepo.save(this.docRepo.create(dto));
  }

  async list(filter: { ownerType?: string; ownerId?: string } = {}) {
    const where: any = {};
    if (filter.ownerType) where.ownerType = filter.ownerType;
    if (filter.ownerId) where.ownerId = filter.ownerId;
    const docs = await this.docRepo.find({ where, order: { expiresAt: 'ASC' }, take: 500 });
    return docs.map((d) => this.decorate(d));
  }

  /** Documents already expired or expiring within `days` — the alert queue. */
  async expiring(days = 30) {
    const cutoff = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const docs = await this.docRepo.find({
      where: { expiresAt: LessThanOrEqual(cutoff) },
      order: { expiresAt: 'ASC' },
      take: 500,
    });
    const decorated = docs.map((d) => this.decorate(d));
    return {
      expired: decorated.filter((d) => d.expiry === 'EXPIRED'),
      expiringSoon: decorated.filter((d) => d.expiry === 'EXPIRING'),
    };
  }

  async update(id: string, dto: Partial<ComplianceDocument>) {
    await this.docRepo.update(id, dto);
    const d = await this.docRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Document not found');
    return this.decorate(d);
  }

  /** Admin verify/reject a submitted document. */
  verify(id: string, status: string, notes?: string) {
    return this.update(id, { status, notes });
  }

  async remove(id: string) {
    await this.docRepo.delete(id);
    return { deleted: true };
  }
}
