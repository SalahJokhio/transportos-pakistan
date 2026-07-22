import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformEvent } from '../entities/platform-event.entity';
import { RulesEngineService } from './rules-engine.service';

export interface EmitOptions {
  companyId?: string | null;
  source?: string;
}

/**
 * The Event Engine. Any service calls `emit()` when something meaningful
 * happens; we persist the event and hand it to the Rules Engine. Emission is
 * best-effort — a failure here must never break the business action that
 * triggered it.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    @InjectRepository(PlatformEvent) private readonly eventRepo: Repository<PlatformEvent>,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  async emit(type: string, payload: Record<string, any> = {}, opts: EmitOptions = {}): Promise<PlatformEvent | null> {
    try {
      const event = await this.eventRepo.save(this.eventRepo.create({
        type,
        payload,
        companyId: opts.companyId ?? null,
        source: opts.source,
      }));
      const fired = await this.rulesEngine.runForEvent(event);
      if (fired) {
        event.matchedRules = fired;
        await this.eventRepo.save(event);
      }
      return event;
    } catch (e: any) {
      this.logger.error(`emit(${type}) failed: ${e.message}`);
      return null; // swallow — caller's flow continues
    }
  }

  list(companyId: string | null, type?: string, limit = 100) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (type) where.type = type;
    return this.eventRepo.find({ where, order: { createdAt: 'DESC' }, take: Math.min(limit, 500) });
  }
}
