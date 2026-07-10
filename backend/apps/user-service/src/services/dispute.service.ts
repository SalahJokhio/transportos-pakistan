import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../entities/dispute.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute) private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: { type: string; subject: string; description?: string; bookingId?: string; pnr?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const dispute = this.disputeRepo.create({
      userId,
      userName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : null,
      type: dto.type || 'COMPLAINT',
      subject: dto.subject,
      description: dto.description ?? null,
      bookingId: dto.bookingId ?? null,
      pnr: dto.pnr ?? null,
      status: 'OPEN',
    });
    return this.disputeRepo.save(dispute);
  }

  listMine(userId: string) {
    return this.disputeRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  /** Admin queue — optionally filter by status. */
  async listAll(status?: string) {
    const where = status ? { status } : {};
    const disputes = await this.disputeRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
    const open = await this.disputeRepo.count({ where: { status: 'OPEN' } });
    return { total: disputes.length, open, disputes };
  }

  async resolve(id: string, status: string, resolution?: string) {
    const dispute = await this.disputeRepo.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    dispute.status = status; // RESOLVED | REJECTED
    if (resolution !== undefined) dispute.resolution = resolution;
    return this.disputeRepo.save(dispute);
  }
}
