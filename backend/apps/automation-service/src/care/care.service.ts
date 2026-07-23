import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LostItem, SosEvent } from './care.entities';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { EventBusService } from '../services/event-bus.service';

/** Lost & Found + Emergency SOS (customer care). Both feed the Event Engine. */
@Injectable()
export class CareService {
  constructor(
    @InjectRepository(LostItem) private readonly lostRepo: Repository<LostItem>,
    @InjectRepository(SosEvent) private readonly sosRepo: Repository<SosEvent>,
    @InjectRepository(AutomationAlert) private readonly alertRepo: Repository<AutomationAlert>,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Lost & Found ────────────────────────────────────────────────────
  async reportLost(userId: string, dto: Partial<LostItem>) {
    const item = await this.lostRepo.save(this.lostRepo.create({ ...dto, userId, status: 'REPORTED' }));
    await this.alertRepo.save(this.alertRepo.create({
      companyId: dto.companyId ?? null, severity: 'warning',
      title: `Lost item reported: ${item.itemName}`,
      message: `${item.itemName}${item.pnr ? ` (PNR ${item.pnr})` : ''}${item.seat ? `, seat ${item.seat}` : ''}`,
      meta: { source: 'lost-found', lostItemId: item.id },
    }));
    this.eventBus.emit('LOST_ITEM_REPORTED', { lostItemId: item.id, itemName: item.itemName, pnr: item.pnr }, { companyId: item.companyId ?? null, source: 'care' }).catch(() => undefined);
    return item;
  }
  listLostMine(userId: string) { return this.lostRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 }); }

  // ── Emergency SOS ───────────────────────────────────────────────────
  async raiseSos(userId: string, dto: Partial<SosEvent>) {
    const sos = await this.sosRepo.save(this.sosRepo.create({ ...dto, userId, status: 'ACTIVE' }));
    await this.alertRepo.save(this.alertRepo.create({
      companyId: null, severity: 'critical',
      title: `🚨 EMERGENCY: ${sos.type}`,
      message: `SOS raised${sos.tripId ? ` on trip ${sos.tripId}` : ''}${sos.lat ? ` @ ${sos.lat.toFixed(4)},${sos.lng?.toFixed(4)}` : ''}. ${sos.note || ''}`,
      meta: { source: 'sos', sosId: sos.id, type: sos.type },
    }));
    // Highest-priority event — rules can page the control room / notify contacts.
    this.eventBus.emit('EMERGENCY_SOS', { sosId: sos.id, type: sos.type, userId, tripId: sos.tripId, lat: sos.lat, lng: sos.lng }, { companyId: null, source: 'care' }).catch(() => undefined);
    return sos;
  }
  listSosMine(userId: string) { return this.sosRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 20 }); }
}
