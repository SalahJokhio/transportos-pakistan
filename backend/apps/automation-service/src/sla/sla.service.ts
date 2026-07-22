import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, IsNull, In } from 'typeorm';
import { SlaConfig, SlaEscalation } from './sla.entities';
import { SupportTicket } from '../../../user-service/src/entities/support-ticket.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { EventBusService } from '../services/event-bus.service';

const DEFAULT_TIERS: Record<string, { response: number; resolve: number }> = {
  URGENT: { response: 1, resolve: 4 },
  HIGH: { response: 4, resolve: 24 },
  MEDIUM: { response: 24, resolve: 72 },
  LOW: { response: 72, resolve: 168 },
};

const H = 3_600_000;

/** SLA + Escalation Engine: configurable tiers, breach detection, auto-escalation. */
@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SlaConfig) private readonly configRepo: Repository<SlaConfig>,
    @InjectRepository(SlaEscalation) private readonly escRepo: Repository<SlaEscalation>,
    @InjectRepository(SupportTicket) private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    private readonly eventBus: EventBusService,
  ) {}

  async getConfig(companyId: string | null) {
    const [platform, own] = await Promise.all([
      this.configRepo.findOne({ where: { companyId: IsNull() } }),
      companyId ? this.configRepo.findOne({ where: { companyId } }) : Promise.resolve(null),
    ]);
    return { ...DEFAULT_TIERS, ...(platform?.tiers ?? {}), ...(own?.tiers ?? {}) };
  }

  async updateConfig(companyId: string | null, tiers: any) {
    let row = await this.configRepo.findOne({ where: companyId ? { companyId } : { companyId: IsNull() } });
    if (!row) row = this.configRepo.create({ companyId: companyId ?? null, tiers: {} });
    row.tiers = { ...row.tiers, ...tiers };
    await this.configRepo.save(row);
    return this.getConfig(companyId);
  }

  /** Decorate open tickets with SLA state for the dashboard. */
  async status(companyId: string | null) {
    const tiers = await this.getConfig(companyId);
    const open = await this.ticketRepo.find({ where: [{ status: 'OPEN' }, { status: 'PENDING' }], order: { createdAt: 'ASC' }, take: 300 });
    return open.map((t) => {
      const tier = tiers[t.priority] ?? tiers.MEDIUM;
      const ageH = (Date.now() - new Date(t.createdAt).getTime()) / H;
      const responded = !!t.firstResponseAt;
      let state: 'OK' | 'AT_RISK' | 'BREACHED' = 'OK';
      const target = responded ? tier.resolve : tier.response;
      if (ageH >= target) state = 'BREACHED';
      else if (ageH >= target * 0.8) state = 'AT_RISK';
      return { id: t.id, subject: t.subject, priority: t.priority, status: t.status, ageHours: Math.round(ageH * 10) / 10, target, responded, state };
    });
  }

  /** Every 15 min: escalate newly-breached tickets (dedup via sla_escalations). */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitor() {
    try {
      const platformTiers = await this.getConfig(null);
      const open = await this.ticketRepo.find({ where: [{ status: 'OPEN' }, { status: 'PENDING' }], take: 500 });
      let escalated = 0;
      for (const t of open) {
        const tier = platformTiers[t.priority] ?? platformTiers.MEDIUM;
        const ageH = (Date.now() - new Date(t.createdAt).getTime()) / H;
        const responded = !!t.firstResponseAt;
        // level 1 = response SLA breached (no first response), level 2 = resolve SLA breached
        const level = !responded && ageH >= tier.response ? 1 : ageH >= tier.resolve ? 2 : 0;
        if (level === 0) continue;

        const exists = await this.escRepo.findOne({ where: { subjectType: 'TICKET', subjectId: t.id, level } });
        if (exists) continue;

        const reason = level === 1
          ? `No first response in ${tier.response}h (${t.priority})`
          : `Not resolved in ${tier.resolve}h (${t.priority})`;
        await this.escRepo.save(this.escRepo.create({ subjectType: 'TICKET', subjectId: t.id, level, reason, companyId: null }));
        await this.alertRepo.save(this.alertRepo.create({
          companyId: null, severity: level === 2 ? 'critical' : 'warning',
          title: `SLA breach (L${level}): ${t.subject}`, message: reason,
          meta: { source: 'sla', ticketId: t.id, level },
        }));
        this.eventBus.emit('SLA_BREACHED', { ticketId: t.id, subject: t.subject, priority: t.priority, level, reason },
          { companyId: null, source: 'sla' }).catch(() => undefined);
        escalated++;
      }
      if (escalated) this.logger.log(`SLA monitor escalated ${escalated} ticket(s)`);
    } catch (e: any) {
      this.logger.warn(`SLA monitor failed: ${e.message}`);
    }
  }

  listEscalations(companyId: string | null) {
    return this.escRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  /** Manual trigger for the dashboard "run now" button. */
  async runNow() { await this.monitor(); return { ok: true }; }
}
