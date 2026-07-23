import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, SupportMessage } from '../entities/support-ticket.entity';

// First-response SLA (hours) by priority.
const SLA_HOURS: Record<string, number> = { URGENT: 1, HIGH: 4, MEDIUM: 24, LOW: 72 };

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket) private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(SupportMessage) private readonly msgRepo: Repository<SupportMessage>,
  ) {}

  /** Attach SLA state: due time for first response, and MET/OK/BREACHED. */
  private withSla(t: SupportTicket) {
    const slaMs = (SLA_HOURS[t.priority] ?? 24) * 3_600_000;
    const dueAt = new Date(new Date(t.createdAt).getTime() + slaMs);
    let sla: 'MET' | 'OK' | 'BREACHED';
    if (t.firstResponseAt) sla = new Date(t.firstResponseAt) <= dueAt ? 'MET' : 'BREACHED';
    else sla = Date.now() > dueAt.getTime() ? 'BREACHED' : 'OK';
    const minutesLeft = t.firstResponseAt ? null : Math.round((dueAt.getTime() - Date.now()) / 60000);
    return { ...t, sla, dueAt, minutesLeft };
  }

  async create(dto: Partial<SupportTicket> & { body?: string }, requester?: { id?: string; name?: string; phone?: string }) {
    const ticket = await this.ticketRepo.save(this.ticketRepo.create({
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority || 'MEDIUM',
      status: 'OPEN',
      requesterId: requester?.id,
      requesterName: requester?.name,
      requesterPhone: requester?.phone,
    }));
    if (dto.body) {
      await this.msgRepo.save(this.msgRepo.create({ ticketId: ticket.id, authorId: requester?.id, authorRole: 'PASSENGER', body: dto.body }));
    }
    return ticket;
  }

  async list(status?: string) {
    const tickets = await this.ticketRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return tickets.map((t) => this.withSla(t));
  }

  async get(id: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const messages = await this.msgRepo.find({ where: { ticketId: id }, order: { createdAt: 'ASC' } });
    return { ...this.withSla(ticket), messages };
  }

  /** Agent reply: append a message, stamp first-response, move to PENDING. */
  async reply(id: string, body: string, author: { id?: string; role?: string }, isInternal = false) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.msgRepo.save(this.msgRepo.create({ ticketId: id, authorId: author.id, authorRole: author.role, body, isInternal }));
    const patch: Partial<SupportTicket> = {};
    if (!ticket.firstResponseAt && !isInternal) patch.firstResponseAt = new Date();
    if (ticket.status === 'OPEN' && !isInternal) patch.status = 'PENDING';
    if (Object.keys(patch).length) await this.ticketRepo.update(id, patch);
    return this.get(id);
  }

  async update(id: string, dto: Partial<SupportTicket>) {
    const patch: any = { ...dto };
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') patch.resolvedAt = new Date();
    await this.ticketRepo.update(id, patch);
    return this.get(id);
  }

  // ── Customer-facing (own tickets only) ──────────────────────────────
  async listMine(userId: string) {
    const tickets = await this.ticketRepo.find({ where: { requesterId: userId }, order: { createdAt: 'DESC' }, take: 100 });
    return tickets.map((t) => this.withSla(t));
  }

  async getMine(id: string, userId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket || ticket.requesterId !== userId) throw new NotFoundException('Ticket not found');
    const messages = await this.msgRepo.find({ where: { ticketId: id, isInternal: false as any }, order: { createdAt: 'ASC' } });
    return { ...this.withSla(ticket), messages };
  }

  /** Customer reply: append their message and reopen for the agent (doesn't stamp first-response). */
  async customerReply(id: string, userId: string, body: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket || ticket.requesterId !== userId) throw new NotFoundException('Ticket not found');
    await this.msgRepo.save(this.msgRepo.create({ ticketId: id, authorId: userId, authorRole: 'PASSENGER', body }));
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'PENDING') {
      await this.ticketRepo.update(id, { status: 'OPEN' });
    }
    return this.getMine(id, userId);
  }

  /** CSAT rating after resolution. */
  async rate(id: string, userId: string, rating: number, comment?: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket || ticket.requesterId !== userId) throw new NotFoundException('Ticket not found');
    await this.ticketRepo.update(id, { rating: Math.max(1, Math.min(5, Number(rating))), ratingComment: comment });
    return this.getMine(id, userId);
  }
}
