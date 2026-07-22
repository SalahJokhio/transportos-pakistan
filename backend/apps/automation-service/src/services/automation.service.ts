import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AutomationRule } from '../entities/automation-rule.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';

/** CRUD for rules + alert inbox (the console-facing side of the engine). */
@Injectable()
export class AutomationService {
  constructor(
    @InjectRepository(AutomationRule) private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
  ) {}

  // ── rules ──────────────────────────────────────────────────────────
  listRules(companyId: string | null) {
    const where: any[] = [{ companyId: IsNull() }];
    if (companyId) where.push({ companyId });
    return this.ruleRepo.find({ where, order: { priority: 'DESC', createdAt: 'DESC' } });
  }

  createRule(companyId: string | null, dto: Partial<AutomationRule>) {
    return this.ruleRepo.save(this.ruleRepo.create({ ...dto, companyId: companyId ?? null }));
  }

  async updateRule(id: string, companyId: string | null, patch: Partial<AutomationRule>) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');
    Object.assign(rule, patch);
    return this.ruleRepo.save(rule);
  }

  async removeRule(id: string) {
    await this.ruleRepo.delete({ id });
    return { deleted: true };
  }

  // ── alerts ─────────────────────────────────────────────────────────
  listAlerts(companyId: string | null, unreadOnly = false) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (unreadOnly) where.isRead = false;
    return this.alertRepo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  async markAlertRead(id: string) {
    await this.alertRepo.update({ id }, { isRead: true });
    return { updated: true };
  }
}
