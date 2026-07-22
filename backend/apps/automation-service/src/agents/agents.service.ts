import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { EventBusService } from '../services/event-bus.service';

export interface AgentInsight {
  id: string;                 // stable-ish key for the UI
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  metric?: string;
  // A one-click action the operator can take — routed through the engines.
  action?: { kind: 'alert'; severity: 'info' | 'warning' | 'critical'; title: string; message: string };
}

type Domain = 'dispatch' | 'finance' | 'fleet';

/**
 * Department AI Agents (Milestone 9, Layer 2). Each agent reads live data for
 * its domain and returns grounded insights + a recommended action that flows
 * through the engines (create an alert, which rules can further react to).
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    private readonly eventBus: EventBusService,
  ) {}

  private seatStats(t: Trip) {
    const vals = Object.values(t.seatAvailability || {});
    const total = vals.length || 1;
    const available = vals.filter((s) => s === 'AVAILABLE').length;
    return { total, available, booked: total - available, occupancy: (total - available) / total };
  }

  // ── Dispatch Agent ──────────────────────────────────────────────────
  async dispatch(companyId?: string): Promise<AgentInsight[]> {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600_000);
    const where: any = { departureTime: Between(now, in48h), status: In(['SCHEDULED', 'BOARDING']) };
    if (companyId) where.companyId = companyId;
    const trips = await this.tripRepo.find({ where, order: { departureTime: 'ASC' }, take: 300 });

    const routes = await this.routeRepo.find();
    const routeName = (id: string) => {
      const r = routes.find((x) => x.id === id);
      return r ? `${r.originCity}→${r.destinationCity}` : 'route';
    };
    const insights: AgentInsight[] = [];

    const unassigned = trips.filter((t) => !t.driverId || t.driverId === 'unassigned');
    for (const t of unassigned.slice(0, 10)) {
      const when = new Date(t.departureTime).toLocaleString('en-PK', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      insights.push({
        id: `dispatch-unassigned-${t.id}`,
        severity: 'critical',
        title: `No driver assigned — ${routeName(t.routeId)}`,
        detail: `Trip departs ${when} with no driver. Assign one before boarding.`,
        action: { kind: 'alert', severity: 'critical', title: 'Unassigned trip', message: `Assign a driver: ${routeName(t.routeId)} departing ${when}` },
      });
    }

    const lowOcc = trips.filter((t) => {
      const hrs = (new Date(t.departureTime).getTime() - now.getTime()) / 3600_000;
      return hrs <= 24 && this.seatStats(t).occupancy < 0.3;
    });
    for (const t of lowOcc.slice(0, 8)) {
      const s = this.seatStats(t);
      insights.push({
        id: `dispatch-lowocc-${t.id}`,
        severity: 'warning',
        title: `Low occupancy — ${routeName(t.routeId)}`,
        detail: `${Math.round(s.occupancy * 100)}% full (${s.booked}/${s.total}) and departs within 24h. Consider a promo or consolidation.`,
        metric: `${Math.round(s.occupancy * 100)}%`,
      });
    }

    if (insights.length === 0) insights.push({ id: 'dispatch-ok', severity: 'info', title: 'Dispatch healthy', detail: 'All upcoming trips have drivers and healthy occupancy.' });
    return insights;
  }

  // ── Finance Agent ───────────────────────────────────────────────────
  async finance(companyId?: string): Promise<AgentInsight[]> {
    const scopeJoin = companyId ? `JOIN trips t ON t.id::text = b."tripId"` : ``;
    const scopeWhere = companyId ? `AND t."companyId" = $1` : ``;
    const params = companyId ? [companyId] : [];
    const insights: AgentInsight[] = [];

    // Revenue: last 7 days vs the 7 before that.
    const rev = await this.tripRepo.query(
      `SELECT
         COALESCE(SUM(b."finalAmount") FILTER (WHERE b."createdAt" >= now() - interval '7 days'),0)::numeric AS last7,
         COALESCE(SUM(b."finalAmount") FILTER (WHERE b."createdAt" >= now() - interval '14 days' AND b."createdAt" < now() - interval '7 days'),0)::numeric AS prev7
       FROM bookings b ${scopeJoin}
       WHERE b.status='CONFIRMED' ${scopeWhere}`, params);
    const last7 = Number(rev?.[0]?.last7 ?? 0), prev7 = Number(rev?.[0]?.prev7 ?? 0);
    if (prev7 > 0) {
      const change = (last7 - prev7) / prev7;
      if (change <= -0.2) insights.push({
        id: 'finance-revdrop', severity: 'critical',
        title: `Revenue down ${Math.round(-change * 100)}% week-on-week`,
        detail: `Last 7 days Rs ${Math.round(last7).toLocaleString()} vs Rs ${Math.round(prev7).toLocaleString()} the week before.`,
        metric: `${Math.round(change * 100)}%`,
        action: { kind: 'alert', severity: 'critical', title: 'Revenue drop', message: `Weekly revenue fell ${Math.round(-change * 100)}% (Rs ${Math.round(last7).toLocaleString()} vs Rs ${Math.round(prev7).toLocaleString()})` },
      });
      else if (change >= 0.2) insights.push({ id: 'finance-revup', severity: 'info', title: `Revenue up ${Math.round(change * 100)}% week-on-week`, detail: `Strong week: Rs ${Math.round(last7).toLocaleString()} vs Rs ${Math.round(prev7).toLocaleString()}.`, metric: `+${Math.round(change * 100)}%` });
    }

    // High-cancel routes.
    const cancel = await this.tripRepo.query(
      `SELECT r."originCity" AS o, r."destinationCity" AS d,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE b.status='CANCELLED')::int AS cancelled
       FROM bookings b JOIN trips t ON t.id::text=b."tripId" JOIN routes r ON r.id::text=t."routeId"
       WHERE 1=1 ${companyId ? `AND t."companyId"=$1` : ``}
       GROUP BY r."originCity", r."destinationCity" HAVING COUNT(*) >= 4
       ORDER BY (COUNT(*) FILTER (WHERE b.status='CANCELLED'))::numeric/COUNT(*) DESC LIMIT 3`, params);
    for (const c of cancel) {
      const rate = c.total > 0 ? c.cancelled / c.total : 0;
      if (rate >= 0.3) insights.push({
        id: `finance-cancel-${c.o}-${c.d}`, severity: 'warning',
        title: `High cancel rate — ${c.o}→${c.d}`,
        detail: `${Math.round(rate * 100)}% cancelled (${c.cancelled}/${c.total}). Review pricing or schedule reliability.`,
        metric: `${Math.round(rate * 100)}%`,
      });
    }

    // COD exposure (unpaid counter reservations).
    const cod = await this.tripRepo.query(
      `SELECT COALESCE(SUM(b."finalAmount"),0)::numeric AS amt, COUNT(*)::int AS n
       FROM bookings b ${scopeJoin}
       WHERE b."paymentMode"='COUNTER' AND b.status IN ('PENDING_PAYMENT','CONFIRMED') ${scopeWhere}`, params);
    const codAmt = Number(cod?.[0]?.amt ?? 0);
    if (codAmt > 0) insights.push({
      id: 'finance-cod', severity: 'info',
      title: `COD exposure Rs ${Math.round(codAmt).toLocaleString()}`,
      detail: `${cod[0].n} counter booking(s) to collect at the terminal.`,
      metric: `Rs ${Math.round(codAmt).toLocaleString()}`,
    });

    if (insights.length === 0) insights.push({ id: 'finance-ok', severity: 'info', title: 'Finance healthy', detail: 'No revenue drops, cancel spikes, or COD exposure detected.' });
    return insights;
  }

  // ── Fleet Agent ─────────────────────────────────────────────────────
  async fleet(companyId?: string): Promise<AgentInsight[]> {
    const buses = await this.busRepo.find({ where: companyId ? { companyId } : {} });
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86400_000);
    const insights: AgentInsight[] = [];

    // Idle active buses: no upcoming trip in the next 7 days.
    for (const bus of buses.filter((b) => b.isActive)) {
      const upcoming = await this.tripRepo.count({ where: { busId: bus.id, departureTime: Between(now, in7d) } });
      if (upcoming === 0) insights.push({
        id: `fleet-idle-${bus.id}`, severity: 'warning',
        title: `Idle bus — ${bus.registrationNumber}`,
        detail: `${bus.make} ${bus.model} (${bus.totalSeats} seats) has no trips scheduled in the next 7 days.`,
        action: { kind: 'alert', severity: 'warning', title: 'Idle bus', message: `${bus.registrationNumber} has no upcoming trips — schedule it or investigate.` },
      });
    }

    // Compliance docs expiring within 30 days (COMPANY/BUS owned).
    const expiring = await this.busRepo.query(
      `SELECT "docType", "ownerType", "ownerId", "expiresAt"
       FROM compliance_documents
       WHERE "expiresAt" IS NOT NULL AND "expiresAt"::date <= (now() + interval '30 days')::date
       ${companyId ? `AND (("ownerType"='COMPANY' AND "ownerId"=$1))` : ``}
       ORDER BY "expiresAt" ASC LIMIT 10`, companyId ? [companyId] : []);
    for (const doc of expiring) {
      const days = Math.ceil((new Date(doc.expiresAt).getTime() - now.getTime()) / 86400_000);
      insights.push({
        id: `fleet-doc-${doc.ownerId}-${doc.docType}`,
        severity: days < 0 ? 'critical' : days <= 7 ? 'critical' : 'warning',
        title: `${doc.docType} ${days < 0 ? 'EXPIRED' : `expires in ${days}d`}`,
        detail: `${doc.ownerType} document ${days < 0 ? 'has expired' : `expires ${new Date(doc.expiresAt).toLocaleDateString()}`}. Renew to stay compliant.`,
        action: { kind: 'alert', severity: 'critical', title: 'Compliance renewal', message: `${doc.docType} for ${doc.ownerType} ${days < 0 ? 'has EXPIRED' : `expires in ${days} days`}` },
      });
    }

    if (insights.length === 0) insights.push({ id: 'fleet-ok', severity: 'info', title: 'Fleet healthy', detail: 'No idle buses or expiring documents.' });
    return insights;
  }

  async run(domain: Domain, companyId?: string): Promise<AgentInsight[]> {
    if (domain === 'dispatch') return this.dispatch(companyId);
    if (domain === 'finance') return this.finance(companyId);
    if (domain === 'fleet') return this.fleet(companyId);
    throw new BadRequestException('Unknown agent');
  }

  /** Cross-agent summary: severity counts per domain. */
  async overview(companyId?: string) {
    const [dispatch, finance, fleet] = await Promise.all([
      this.dispatch(companyId), this.finance(companyId), this.fleet(companyId),
    ]);
    const tally = (arr: AgentInsight[]) => ({
      total: arr.filter((i) => !i.id.endsWith('-ok')).length,
      critical: arr.filter((i) => i.severity === 'critical').length,
      warning: arr.filter((i) => i.severity === 'warning').length,
    });
    return { dispatch: tally(dispatch), finance: tally(finance), fleet: tally(fleet) };
  }

  /** Execute an insight's recommended action through the engines. */
  async act(companyId: string | null, action: AgentInsight['action'], domain?: string) {
    if (!action || action.kind !== 'alert') throw new BadRequestException('Unsupported action');
    const alert = await this.alertRepo.save(this.alertRepo.create({
      companyId, severity: action.severity, title: action.title, message: action.message,
      meta: { source: 'agent', domain },
    }));
    // Also emit so rules can chain off an agent's finding.
    this.eventBus.emit('AGENT_FLAGGED', { domain, title: action.title, severity: action.severity }, { companyId, source: `agent.${domain}` }).catch(() => undefined);
    return alert;
  }
}
