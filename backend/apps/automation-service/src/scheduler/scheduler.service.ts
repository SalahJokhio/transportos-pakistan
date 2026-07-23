import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThan } from 'typeorm';
import { ScheduledJob } from './scheduler.entity';
import { PlatformEvent } from '../entities/platform-event.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { EventBusService } from '../services/event-bus.service';

const INTERVAL_MS: Record<string, number> = { HOURLY: 3_600_000, DAILY: 86_400_000, WEEKLY: 604_800_000 };

const DEFAULT_JOBS = [
  { name: 'Purge old events (90d)', jobType: 'CLEANUP_EVENTS', frequency: 'DAILY' },
  { name: 'Stale ticket sweep', jobType: 'TICKET_EXPIRY', frequency: 'DAILY' },
  { name: 'Demand forecast snapshot', jobType: 'FORECAST_SNAPSHOT', frequency: 'DAILY' },
  { name: 'Payroll reminder', jobType: 'PAYROLL_REMINDER', frequency: 'WEEKLY' },
];

/** Scheduling + Automation Engine: runs configurable jobs when due. */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(ScheduledJob) private readonly jobRepo: Repository<ScheduledJob>,
    @InjectRepository(PlatformEvent) private readonly eventRepo: Repository<PlatformEvent>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    private readonly eventBus: EventBusService,
  ) {}

  list(companyId: string | null) {
    return this.jobRepo.find({ order: { createdAt: 'ASC' } });
  }
  create(companyId: string | null, dto: Partial<ScheduledJob>) {
    return this.jobRepo.save(this.jobRepo.create({ ...dto, companyId: companyId ?? null }));
  }
  async toggle(id: string) {
    const j = await this.jobRepo.findOne({ where: { id } });
    if (!j) return { ok: false };
    j.isActive = !j.isActive; await this.jobRepo.save(j); return j;
  }
  async remove(id: string) { await this.jobRepo.delete({ id }); return { deleted: true }; }

  async installDefaults() {
    const existing = await this.jobRepo.find();
    const have = new Set(existing.map((j) => j.jobType));
    let installed = 0;
    for (const d of DEFAULT_JOBS) if (!have.has(d.jobType)) { await this.jobRepo.save(this.jobRepo.create({ ...d, companyId: null })); installed++; }
    return { installed };
  }

  async runNow(id: string) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) return { ok: false };
    return this.execute(job);
  }

  /** Dispatch: every 30 min, run any active job whose interval has elapsed. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async dispatch() {
    const jobs = await this.jobRepo.find({ where: { isActive: true } });
    for (const job of jobs) {
      const interval = INTERVAL_MS[job.frequency] ?? INTERVAL_MS.DAILY;
      const due = !job.lastRunAt || Date.now() - new Date(job.lastRunAt).getTime() >= interval;
      if (due) { try { await this.execute(job); } catch (e: any) { this.logger.warn(`job ${job.name} failed: ${e.message}`); } }
    }
  }

  private async execute(job: ScheduledJob) {
    let result = 'ok';
    switch (job.jobType) {
      case 'CLEANUP_EVENTS': {
        const cutoff = new Date(Date.now() - 90 * 86_400_000);
        const r = await this.eventRepo.delete({ createdAt: LessThan(cutoff) } as any);
        result = `purged ${r.affected ?? 0} events`;
        break;
      }
      case 'TICKET_EXPIRY': {
        const rows = await this.jobRepo.query(
          `SELECT COUNT(*)::int n FROM support_tickets WHERE status IN ('OPEN','PENDING') AND "createdAt" < now() - interval '30 days'`);
        const n = Number(rows?.[0]?.n ?? 0);
        if (n > 0) await this.alertRepo.save(this.alertRepo.create({ companyId: null, severity: 'warning', title: 'Stale tickets', message: `${n} support ticket(s) open >30 days`, meta: { source: 'scheduler' } }));
        result = `${n} stale ticket(s)`;
        break;
      }
      case 'FORECAST_SNAPSHOT': {
        const rows = await this.jobRepo.query(
          `SELECT r."originCity" o, r."destinationCity" d, COUNT(b.id)::int n
           FROM bookings b JOIN trips t ON t.id::text=b."tripId" JOIN routes r ON r.id::text=t."routeId"
           WHERE b.status='CONFIRMED' GROUP BY 1,2 ORDER BY n DESC LIMIT 1`);
        const top = rows?.[0];
        this.eventBus.emit('DEMAND_FORECAST', { topRoute: top ? `${top.o}→${top.d}` : null, bookings: top?.n ?? 0 }, { companyId: null, source: 'scheduler' }).catch(() => undefined);
        result = top ? `top ${top.o}→${top.d}` : 'no data';
        break;
      }
      case 'PAYROLL_REMINDER': {
        this.eventBus.emit('PAYROLL_DUE', { month: new Date().toISOString().slice(0, 7) }, { companyId: null, source: 'scheduler' }).catch(() => undefined);
        result = 'reminder emitted';
        break;
      }
      default: result = 'unknown job type';
    }
    job.lastRunAt = new Date(); job.lastResult = result;
    await this.jobRepo.save(job);
    return { ok: true, result };
  }
}
