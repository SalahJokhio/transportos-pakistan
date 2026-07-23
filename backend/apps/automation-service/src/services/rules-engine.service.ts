import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AutomationRule, RuleCondition, RuleAction } from '../entities/automation-rule.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { PlatformEvent } from '../entities/platform-event.entity';
import { InboxNotification } from '../inbox/inbox.entity';
import { NotificationService } from '../../../notification-service/src/notification.service';

/** Evaluates no-code rules against events and runs their actions. */
@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(
    @InjectRepository(AutomationRule) private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    @InjectRepository(InboxNotification) private readonly inboxRepo: Repository<InboxNotification>,
    private readonly notifications: NotificationService,
  ) {}

  /** Run every active rule that matches this event. Returns how many fired. */
  async runForEvent(event: PlatformEvent): Promise<number> {
    // Tenant rules + platform-wide rules (companyId IS NULL) for this event type.
    const where: any[] = [{ eventType: event.type, isActive: true, companyId: IsNull() }];
    if (event.companyId) where.push({ eventType: event.type, isActive: true, companyId: event.companyId });

    const rules = await this.ruleRepo.find({ where, order: { priority: 'DESC', createdAt: 'ASC' } });
    let fired = 0;
    for (const rule of rules) {
      try {
        if (!this.matches(rule.conditions || [], event.payload || {})) continue;
        await this.executeActions(rule, event);
        rule.fireCount = (rule.fireCount || 0) + 1;
        rule.lastFiredAt = new Date();
        await this.ruleRepo.save(rule);
        fired++;
      } catch (e: any) {
        this.logger.warn(`rule ${rule.id} (${rule.name}) failed: ${e.message}`);
      }
    }
    return fired;
  }

  /** Dry-run: which rules WOULD fire for a hypothetical event (no side-effects). */
  async simulate(companyId: string | null, type: string, payload: Record<string, any>) {
    const where: any[] = [{ eventType: type, isActive: true, companyId: IsNull() }];
    if (companyId) where.push({ eventType: type, isActive: true, companyId });
    const rules = await this.ruleRepo.find({ where, order: { priority: 'DESC', createdAt: 'ASC' } });
    return rules
      .filter((r) => this.matches(r.conditions || [], payload || {}))
      .map((r) => ({ id: r.id, name: r.name, actions: r.actions }));
  }

  // ── condition evaluation ───────────────────────────────────────────
  private matches(conditions: RuleCondition[], payload: Record<string, any>): boolean {
    return conditions.every((c) => this.matchOne(c, payload));
  }

  private matchOne(c: RuleCondition, payload: Record<string, any>): boolean {
    const actual = this.resolve(c.field, payload);
    const expected = c.value;
    switch (c.op) {
      case 'eq': return actual == expected;
      case 'ne': return actual != expected;
      case 'gt': return Number(actual) > Number(expected);
      case 'gte': return Number(actual) >= Number(expected);
      case 'lt': return Number(actual) < Number(expected);
      case 'lte': return Number(actual) <= Number(expected);
      case 'contains': return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
      case 'in': return Array.isArray(expected) && expected.map(String).includes(String(actual));
      case 'exists': return actual !== undefined && actual !== null;
      default: return false;
    }
  }

  /** Dot-path lookup: "passenger.age" → payload.passenger.age. */
  private resolve(path: string, obj: any): any {
    return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  /** {{payload.field}} template interpolation for messages. */
  private interpolate(tpl: string, event: PlatformEvent): string {
    return String(tpl ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const root = path.startsWith('payload.') ? event.payload : { payload: event.payload, ...event.payload };
      const val = this.resolve(path.replace(/^payload\./, ''), event.payload) ?? this.resolve(path, root);
      return val == null ? '' : String(val);
    });
  }

  // ── action execution ───────────────────────────────────────────────
  private async executeActions(rule: AutomationRule, event: PlatformEvent): Promise<void> {
    for (const action of rule.actions || []) {
      switch (action.type) {
        case 'alert':
          await this.alertRepo.save(this.alertRepo.create({
            companyId: event.companyId,
            ruleId: rule.id,
            severity: (action.severity as any) || 'info',
            title: this.interpolate(action.title || rule.name, event),
            message: this.interpolate(action.message || '', event),
            meta: { eventType: event.type, eventId: event.id },
          }));
          break;

        case 'notify': {
          const to = this.interpolate(action.to || '', event) || this.resolve(action.to, event.payload);
          const message = this.interpolate(action.message || '', event);
          if (!to) { this.logger.warn(`notify skipped (no recipient) rule ${rule.id}`); break; }
          const title = this.interpolate(action.title || rule.name, event);
          switch (action.channel) {
            case 'inapp': await this.inboxRepo.save(this.inboxRepo.create({ userId: to, title, body: message, type: action.notifType || 'info' })); break;
            case 'whatsapp': await this.notifications.sendWhatsApp({ to, message } as any); break;
            case 'email': await this.notifications.sendEmail({ to, subject: title, body: message }); break;
            case 'telegram': await this.notifications.sendTelegram({ to, message }); break;
            case 'push': await this.notifications.sendPush({ to, title, body: message }); break;
            default: await this.notifications.sendSms({ to, message } as any);
          }
          break;
        }

        case 'webhook': {
          if (!action.url) break;
          // Fire-and-forget POST; never let an integration failure break the rule.
          try {
            await fetch(action.url, {
              method: action.method || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: event.type, companyId: event.companyId, payload: event.payload }),
            });
          } catch (e: any) { this.logger.warn(`webhook ${action.url} failed: ${e.message}`); }
          break;
        }

        case 'log':
        default:
          this.logger.log(`rule "${rule.name}" matched event ${event.type} (${event.id})`);
      }
    }
  }
}
