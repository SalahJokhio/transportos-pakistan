import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { CreateRouteDto } from '../dto/fleet.dto';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
  ) {}

  async create(dto: CreateRouteDto, companyId: string): Promise<Route> {
    const route = this.routeRepo.create({ ...dto });
    return this.routeRepo.save(route);
  }

  async findAll(): Promise<Route[]> {
    return this.routeRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Route> {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async getCities(): Promise<string[]> {
    const routes = await this.routeRepo.find({ where: { isActive: true } });
    const cities = new Set<string>();
    routes.forEach(r => { cities.add(r.originCity); cities.add(r.destinationCity); });
    return Array.from(cities).sort();
  }
}
