import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedTraveler, SavedAddress, NotificationPreference } from '../entities/profile-extras.entities';

const DEFAULT_PREFS: Record<string, Record<string, boolean>> = {
  booking: { push: true, sms: true, email: true, whatsapp: true },
  trips: { push: true, sms: true, email: false, whatsapp: true },
  payments: { push: true, sms: true, email: true, whatsapp: false },
  marketing: { push: false, sms: false, email: true, whatsapp: false },
  security: { push: true, sms: true, email: true, whatsapp: false },
};

/** Saved travellers, saved addresses, and notification preferences. */
@Injectable()
export class ProfileExtrasService {
  constructor(
    @InjectRepository(SavedTraveler) private readonly travelerRepo: Repository<SavedTraveler>,
    @InjectRepository(SavedAddress) private readonly addressRepo: Repository<SavedAddress>,
    @InjectRepository(NotificationPreference) private readonly prefRepo: Repository<NotificationPreference>,
  ) {}

  // travellers
  listTravelers(userId: string) { return this.travelerRepo.find({ where: { userId }, order: { createdAt: 'ASC' } }); }
  addTraveler(userId: string, dto: Partial<SavedTraveler>) { return this.travelerRepo.save(this.travelerRepo.create({ ...dto, userId })); }
  async updateTraveler(id: string, userId: string, dto: Partial<SavedTraveler>) {
    await this.travelerRepo.update({ id, userId }, dto); return this.travelerRepo.findOne({ where: { id } });
  }
  async removeTraveler(id: string, userId: string) { await this.travelerRepo.delete({ id, userId }); return { deleted: true }; }

  // addresses
  listAddresses(userId: string) { return this.addressRepo.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'ASC' } }); }
  async addAddress(userId: string, dto: Partial<SavedAddress>) {
    if (dto.isDefault) await this.addressRepo.update({ userId }, { isDefault: false });
    return this.addressRepo.save(this.addressRepo.create({ ...dto, userId }));
  }
  async updateAddress(id: string, userId: string, dto: Partial<SavedAddress>) {
    if (dto.isDefault) await this.addressRepo.update({ userId }, { isDefault: false });
    await this.addressRepo.update({ id, userId }, dto); return this.addressRepo.findOne({ where: { id } });
  }
  async removeAddress(id: string, userId: string) { await this.addressRepo.delete({ id, userId }); return { deleted: true }; }

  // notification preferences
  async getPrefs(userId: string) {
    const row = await this.prefRepo.findOne({ where: { userId } });
    // merge stored over defaults so new categories/channels always appear
    const merged: any = JSON.parse(JSON.stringify(DEFAULT_PREFS));
    for (const cat of Object.keys(row?.prefs ?? {})) merged[cat] = { ...merged[cat], ...row!.prefs[cat] };
    return merged;
  }
  async setPrefs(userId: string, prefs: Record<string, Record<string, boolean>>) {
    let row = await this.prefRepo.findOne({ where: { userId } });
    if (!row) row = this.prefRepo.create({ userId, prefs: {} });
    row.prefs = prefs;
    await this.prefRepo.save(row);
    return this.getPrefs(userId);
  }
}
