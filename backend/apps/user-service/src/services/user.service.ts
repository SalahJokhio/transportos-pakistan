import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/register.dto';
import { PaginationOptions } from '@app/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    await this.userRepo.update(id, dto);
    return this.findById(id);
  }

  async listUsers(options: PaginationOptions & { role?: string }) {
    const { page = 1, limit = 20, role } = options;
    const qb = this.userRepo.createQueryBuilder('user');
    if (role) qb.andWhere('user.role = :role', { role });
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deactivate(id: string): Promise<void> {
    await this.userRepo.update(id, { isActive: false });
  }

  async addLoyaltyPoints(userId: string, points: number): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'loyaltyPoints', points);
  }
}
