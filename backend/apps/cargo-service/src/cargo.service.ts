import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel } from './parcel.entity';

const BASE_FARE = 150;
const RATE_PER_KG = 40;

@Injectable()
export class CargoService {
  constructor(@InjectRepository(Parcel) private readonly repo: Repository<Parcel>) {}

  private trackingNo(): string {
    return 'CGO' + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString().slice(-4);
  }

  /** Book a parcel; price = base + weight rate (a real quote engine can replace this). */
  async book(dto: Partial<Parcel>, companyId?: string) {
    const weight = Number(dto.weightKg) || 0;
    const price = BASE_FARE + Math.ceil(weight) * RATE_PER_KG;
    return this.repo.save(this.repo.create({ ...dto, companyId, price, trackingNo: this.trackingNo(), status: 'BOOKED' }));
  }

  /** Public tracking by tracking number. */
  async track(trackingNo: string) {
    const parcel = await this.repo.findOne({ where: { trackingNo } });
    if (!parcel) throw new NotFoundException('Parcel not found');
    return parcel;
  }

  list(companyId?: string) {
    return this.repo.find({ where: companyId ? { companyId } : {}, order: { createdAt: 'DESC' }, take: 200 });
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }
}
