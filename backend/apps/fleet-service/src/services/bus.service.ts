import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from '../entities/bus.entity';
import { CreateBusDto } from '../dto/fleet.dto';

@Injectable()
export class BusService {
  constructor(
    @InjectRepository(Bus) private readonly busRepo: Repository<Bus>,
  ) {}

  async create(dto: CreateBusDto, companyId: string): Promise<Bus> {
    const bus = this.busRepo.create({ ...dto, companyId });
    return this.busRepo.save(bus);
  }

  async findByCompany(companyId: string): Promise<Bus[]> {
    return this.busRepo.find({ where: { companyId, isActive: true } });
  }

  async findById(id: string): Promise<Bus> {
    const bus = await this.busRepo.findOne({ where: { id } });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  generateSeatLayout(totalSeats: number): any {
    const seatsPerRow = 4;
    const rows = Math.ceil(totalSeats / seatsPerRow);
    const layout = [];
    let seatNum = 1;
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= seatsPerRow && seatNum <= totalSeats; col++) {
        layout.push({
          seatNumber: String(seatNum).padStart(2, '0'),
          row,
          col,
          type: col === 1 || col === 4 ? 'window' : 'aisle',
        });
        seatNum++;
      }
    }
    return { rows, seatsPerRow, layout };
  }
}
