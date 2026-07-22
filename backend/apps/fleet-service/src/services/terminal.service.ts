import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Terminal } from '../entities/terminal.entity';

@Injectable()
export class TerminalService {
  constructor(@InjectRepository(Terminal) private readonly repo: Repository<Terminal>) {}

  create(companyId: string, dto: Partial<Terminal>) {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }
  list(companyId: string, city?: string) {
    const where: any = { companyId };
    if (city) where.city = city;
    return this.repo.find({ where, order: { city: 'ASC', name: 'ASC' } });
  }
  async update(id: string, companyId: string, dto: Partial<Terminal>) {
    await this.repo.update({ id, companyId }, dto);
    return this.repo.findOne({ where: { id } });
  }
  async remove(id: string, companyId: string) {
    await this.repo.delete({ id, companyId });
    return { deleted: true };
  }
}
