import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from '../entities/shift.entity';
import { Booking } from '../entities/booking.entity';

/** Counter-agent cash shifts: open, then close with reconciliation. */
@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(Shift) private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
  ) {}

  current(agentId: string) {
    return this.shiftRepo.findOne({ where: { agentId, status: 'OPEN' }, order: { openedAt: 'DESC' } });
  }

  async open(agentId: string, companyId: string, openingCash = 0) {
    const existing = await this.current(agentId);
    if (existing) throw new BadRequestException('A shift is already open — close it first');
    return this.shiftRepo.save(this.shiftRepo.create({ agentId, companyId, openingCash, status: 'OPEN' }));
  }

  async close(agentId: string, closingCash = 0) {
    const shift = await this.current(agentId);
    if (!shift) throw new BadRequestException('No open shift to close');

    // Cash + bookings this agent took during the shift.
    const agg = await this.bookingRepo
      .createQueryBuilder('b')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(b.finalAmount), 0)', 'sum')
      .where('b.bookedById = :agentId', { agentId })
      .andWhere('b.createdAt >= :openedAt', { openedAt: shift.openedAt })
      .andWhere("b.status = 'CONFIRMED'")
      .getRawOne();

    const cashCollected = Number(agg?.sum ?? 0);
    await this.shiftRepo.update(shift.id, {
      status: 'CLOSED',
      closedAt: new Date(),
      closingCash,
      cashCollected,
      bookingsCount: Number(agg?.count ?? 0),
    });
    const closed = await this.shiftRepo.findOne({ where: { id: shift.id } });
    // Variance = counted cash vs expected (opening + collected).
    const expected = Number(shift.openingCash) + cashCollected;
    return { ...closed, expectedCash: expected, variance: Number(closingCash) - expected };
  }

  history(agentId: string) {
    return this.shiftRepo.find({ where: { agentId }, order: { openedAt: 'DESC' }, take: 30 });
  }
}
