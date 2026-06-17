import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RouteService } from '../services/route.service';
import { BusService } from '../services/bus.service';
import { TripService } from '../services/trip.service';
import { CreateRouteDto, CreateBusDto, CreateTripDto } from '../dto/fleet.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TripStatus } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../entities/trip.entity';

@ApiTags('Operator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operator')
export class OperatorController {
  constructor(
    private readonly routeService: RouteService,
    private readonly busService: BusService,
    private readonly tripService: TripService,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Operator dashboard summary' })
  async dashboard(@Request() req) {
    const companyId = req.user?.companyId || req.user?.sub;
    const buses = await this.busService.findByCompany(companyId);
    const routes = await this.routeService.findAll();
    return {
      totalBuses: buses.length,
      activeBuses: buses.filter((b) => b.isActive).length,
      totalRoutes: routes.length,
    };
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get operator routes' })
  getRoutes() {
    return this.routeService.findAll();
  }

  @Post('routes')
  @ApiOperation({ summary: 'Create new route' })
  createRoute(@Body() dto: CreateRouteDto, @Request() req) {
    return this.routeService.create(dto, req.user?.companyId || req.user?.sub);
  }

  @Get('buses')
  @ApiOperation({ summary: 'Get operator fleet' })
  getBuses(@Request() req) {
    const companyId = req.user?.companyId || req.user?.sub;
    return this.busService.findByCompany(companyId);
  }

  @Post('buses')
  @ApiOperation({ summary: 'Register a bus' })
  createBus(@Body() dto: CreateBusDto, @Request() req) {
    return this.busService.create(dto, req.user?.companyId || req.user?.sub);
  }

  @Post('trips')
  @ApiOperation({ summary: 'Schedule a trip' })
  createTrip(@Body() dto: CreateTripDto, @Request() req) {
    return this.tripService.create(dto, req.user?.companyId || req.user?.sub);
  }

  @Get('trips')
  @ApiOperation({ summary: 'Get operator trips' })
  async getTrips(@Request() req) {
    const companyId = req.user?.companyId || req.user?.sub;
    return this.tripRepo.find({
      where: { companyId },
      order: { departureTime: 'DESC' },
    });
  }

  @Patch('trips/:id/status')
  @ApiOperation({ summary: 'Update trip status (BOARDING, DEPARTED, ARRIVED, CANCELLED)' })
  updateTripStatus(
    @Param('id') id: string,
    @Body() body: { status: TripStatus },
  ) {
    return this.tripService.updateStatus(id, body.status);
  }
}
