import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Employee } from '../../../fleet-service/src/entities/employee.entity';
import { TripReport } from '../../../fleet-service/src/entities/trip-report.entity';
import { SupportTicket } from '../../../user-service/src/entities/support-ticket.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { EventBusService } from '../services/event-bus.service';
import { WorkflowService } from '../workflow/workflow.service';

export interface AgentInsight {
  id: string;                 // stable-ish key for the UI
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  metric?: string;
  // A one-click action the operator can take — routed through the engines.
  action?:
    | { kind: 'alert'; severity: 'info' | 'warning' | 'critical'; title: string; message: string }
    | { kind: 'workflow'; category: string; title: string; amount?: number };
}

type Domain = 'dispatch' | 'finance' | 'fleet' | 'hr' | 'crm' | 'workshop';

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
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(TripReport) private readonly reportRepo: Repository<TripReport>,
    @InjectRepository(SupportTicket) private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    private readonly eventBus: EventBusService,
    private readonly workflows: WorkflowService,
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

  // ── HR Agent ────────────────────────────────────────────────────────
  async hr(companyId?: string): Promise<AgentInsight[]> {
    const insights: AgentInsight[] = [];
    const today = new Date().toISOString().slice(0, 10);

    const onLeave = await this.employeeRepo.count({ where: { ...(companyId ? { companyId } : {}), status: 'ON_LEAVE' as any } });
    if (onLeave > 0) insights.push({ id: 'hr-onleave', severity: 'info', title: `${onLeave} staff on leave`, detail: `${onLeave} employee(s) currently ON_LEAVE — check coverage for their shifts.`, metric: String(onLeave) });

    const absent = await this.employeeRepo.query(
      `SELECT COUNT(*)::int AS n FROM attendance WHERE date = $1 AND status = 'ABSENT' ${companyId ? `AND "companyId" = $2` : ``}`,
      companyId ? [today, companyId] : [today]);
    const absentN = Number(absent?.[0]?.n ?? 0);
    if (absentN > 0) insights.push({ id: 'hr-absent', severity: 'warning', title: `${absentN} absent today`, detail: `${absentN} employee(s) marked ABSENT for ${today}. Arrange cover if any are drivers/conductors.`, metric: String(absentN), action: { kind: 'alert', severity: 'warning', title: 'Staff absent', message: `${absentN} staff absent today (${today})` } });

    // Driver documents expiring (license/CNIC) via compliance registry.
    const docs = await this.employeeRepo.query(
      `SELECT "docType", "ownerId", "expiresAt" FROM compliance_documents
       WHERE "ownerType"='DRIVER' AND "expiresAt" IS NOT NULL AND "expiresAt"::date <= (now() + interval '30 days')::date
       ORDER BY "expiresAt" ASC LIMIT 8`);
    for (const d of docs) {
      const days = Math.ceil((new Date(d.expiresAt).getTime() - Date.now()) / 86400_000);
      insights.push({ id: `hr-doc-${d.ownerId}-${d.docType}`, severity: days < 0 ? 'critical' : 'warning', title: `Driver ${d.docType} ${days < 0 ? 'EXPIRED' : `expires in ${days}d`}`, detail: `A driver's ${d.docType} ${days < 0 ? 'has expired' : `expires ${new Date(d.expiresAt).toLocaleDateString()}`}. Block dispatch until renewed.`, action: { kind: 'alert', severity: 'critical', title: 'Driver document', message: `Driver ${d.docType} ${days < 0 ? 'EXPIRED' : `expires in ${days}d`}` } });
    }

    if (insights.length === 0) insights.push({ id: 'hr-ok', severity: 'info', title: 'HR healthy', detail: 'Full attendance, no leave gaps or expiring driver documents.' });
    return insights;
  }

  // ── CRM Agent (support is platform-scoped) ──────────────────────────
  async crm(_companyId?: string): Promise<AgentInsight[]> {
    const SLA: Record<string, number> = { URGENT: 1, HIGH: 4, MEDIUM: 24, LOW: 72 };
    const open = await this.ticketRepo.find({ where: [{ status: 'OPEN' }, { status: 'PENDING' }], order: { createdAt: 'ASC' }, take: 300 });
    const insights: AgentInsight[] = [];

    const breached = open.filter((t) => !t.firstResponseAt && (Date.now() - new Date(t.createdAt).getTime()) > (SLA[t.priority] ?? 24) * 3600_000);
    if (breached.length) insights.push({ id: 'crm-sla', severity: 'critical', title: `${breached.length} ticket(s) breaching SLA`, detail: `${breached.length} open ticket(s) past first-response SLA. Respond now to recover.`, metric: String(breached.length), action: { kind: 'alert', severity: 'critical', title: 'SLA breach', message: `${breached.length} support ticket(s) past first-response SLA` } });

    const urgent = open.filter((t) => t.priority === 'URGENT');
    if (urgent.length) insights.push({ id: 'crm-urgent', severity: 'warning', title: `${urgent.length} urgent ticket(s) open`, detail: `${urgent.length} URGENT-priority ticket(s) still unresolved.`, metric: String(urgent.length) });

    if (open.length) insights.push({ id: 'crm-backlog', severity: 'info', title: `${open.length} open ticket(s)`, detail: `Current support backlog across all priorities.`, metric: String(open.length) });

    if (insights.length === 0) insights.push({ id: 'crm-ok', severity: 'info', title: 'CRM healthy', detail: 'No SLA breaches or urgent tickets. Backlog clear.' });
    return insights;
  }

  // ── Workshop Agent (from driver trip reports) ───────────────────────
  async workshop(companyId?: string): Promise<AgentInsight[]> {
    const insights: AgentInsight[] = [];
    const params = companyId ? [companyId] : [];
    const scope = companyId ? `AND "companyId" = $1` : ``;

    const incidents = await this.reportRepo.query(
      `SELECT COUNT(*)::int AS n FROM trip_reports WHERE type = 'incident' AND "createdAt" >= now() - interval '14 days' ${scope}`, params);
    const incN = Number(incidents?.[0]?.n ?? 0);
    if (incN > 0) insights.push({ id: 'workshop-incidents', severity: incN >= 3 ? 'critical' : 'warning', title: `${incN} incident(s) in 14 days`, detail: `${incN} on-road incident(s) reported by drivers (breakdowns, punctures…). Inspect the affected vehicles.`, metric: String(incN), action: { kind: 'alert', severity: 'warning', title: 'Incident cluster', message: `${incN} on-road incidents in the last 14 days` } });

    const spend = await this.reportRepo.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS amt FROM trip_reports
       WHERE (LOWER(category) LIKE '%repair%' OR LOWER(category) LIKE '%break%' OR LOWER(category) LIKE '%tyre%' OR LOWER(category) LIKE '%tire%')
         AND "createdAt" >= now() - interval '30 days' ${scope}`, params);
    const amt = Number(spend?.[0]?.amt ?? 0);
    if (amt > 0) insights.push({ id: 'workshop-spend', severity: amt >= 50000 ? 'warning' : 'info', title: `Rs ${Math.round(amt).toLocaleString()} repair spend (30d)`, detail: `Maintenance/repair spend reported in the last 30 days.` + (amt >= 50000 ? ' Consider a formal repair approval.' : ''), metric: `Rs ${Math.round(amt).toLocaleString()}`, action: amt >= 50000 ? { kind: 'workflow', category: 'MAINTENANCE', title: `Repair budget approval (Rs ${Math.round(amt).toLocaleString()})`, amount: Math.round(amt) } : undefined });

    if (insights.length === 0) insights.push({ id: 'workshop-ok', severity: 'info', title: 'Workshop healthy', detail: 'No recent incidents or elevated repair spend.' });
    return insights;
  }

  async run(domain: Domain, companyId?: string): Promise<AgentInsight[]> {
    switch (domain) {
      case 'dispatch': return this.dispatch(companyId);
      case 'finance': return this.finance(companyId);
      case 'fleet': return this.fleet(companyId);
      case 'hr': return this.hr(companyId);
      case 'crm': return this.crm(companyId);
      case 'workshop': return this.workshop(companyId);
      default: throw new BadRequestException('Unknown agent');
    }
  }

  /** Cross-agent summary: severity counts per domain. */
  async overview(companyId?: string) {
    const domains: Domain[] = ['dispatch', 'finance', 'fleet', 'hr', 'crm', 'workshop'];
    const results = await Promise.all(domains.map((d) => this.run(d, companyId)));
    const tally = (arr: AgentInsight[]) => ({
      total: arr.filter((i) => !i.id.endsWith('-ok')).length,
      critical: arr.filter((i) => i.severity === 'critical').length,
      warning: arr.filter((i) => i.severity === 'warning').length,
    });
    return Object.fromEntries(domains.map((d, i) => [d, tally(results[i])]));
  }

  /** Execute an insight's recommended action through the engines. */
  async act(actor: { userId: string; role?: string; companyId: string | null }, action: AgentInsight['action'], domain?: string) {
    if (!action) throw new BadRequestException('No action to execute');
    const companyId = actor.companyId;

    if (action.kind === 'alert') {
      const alert = await this.alertRepo.save(this.alertRepo.create({
        companyId, severity: action.severity, title: action.title, message: action.message,
        meta: { source: 'agent', domain },
      }));
      this.eventBus.emit('AGENT_FLAGGED', { domain, title: action.title, severity: action.severity }, { companyId, source: `agent.${domain}` }).catch(() => undefined);
      return { kind: 'alert', alert };
    }

    if (action.kind === 'workflow') {
      // Find an active approval chain matching the category (tenant or platform).
      const defs = await this.workflows.listDefinitions(companyId);
      const def = defs.find((d) => d.isActive && d.category === action.category) || defs.find((d) => d.isActive);
      if (!def) throw new BadRequestException(`No ${action.category} approval workflow configured — create one in Workflows first.`);
      const inst = await this.workflows.start(actor, { definitionId: def.id, title: action.title, amount: action.amount });
      this.eventBus.emit('AGENT_FLAGGED', { domain, title: action.title, startedWorkflow: def.name }, { companyId, source: `agent.${domain}` }).catch(() => undefined);
      return { kind: 'workflow', instance: inst, workflow: def.name };
    }

    throw new BadRequestException('Unsupported action');
  }
}
