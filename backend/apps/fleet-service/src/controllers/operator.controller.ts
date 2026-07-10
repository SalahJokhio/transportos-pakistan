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
import { BookingService } from '../../../booking-service/src/services/booking.service';
import { TripReportService } from '../services/trip-report.service';
import { FleetAnalyticsService } from '../services/fleet-analytics.service';
import { DriverRecordService } from '../services/driver-record.service';

@ApiTags('Operator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operator')
export class OperatorController {
  constructor(
    private readonly routeService: RouteService,
    private readonly busService: BusService,
    private readonly tripService: TripService,
    private readonly bookingService: BookingService,
    private readonly tripReportService: TripReportService,
    private readonly fleetAnalyticsService: FleetAnalyticsService,
    private readonly driverRecordService: DriverRecordService,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
  ) {}

  @Get('drivers')
  @ApiOperation({ summary: 'List drivers (with rating + trips) for assignment' })
  drivers() {
    return this.driverRecordService.listDrivers();
  }

  @Patch('trips/:tripId/driver')
  @ApiOperation({ summary: 'Assign / reassign a driver to a trip' })
  assignDriver(@Param('tripId') tripId: string, @Body() body: { driverId: string }, @Request() req) {
    return this.tripService.assignDriver(tripId, body.driverId, req.user?.companyId || req.user?.sub);
  }

  @Get('fleet-report')
  @ApiOperation({ summary: 'Per-bus profit/loss: revenue − expenses, best/worst performer' })
  fleetReport(@Request() req) {
    return this.fleetAnalyticsService.getFleetReport(req.user?.companyId || req.user?.sub);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Owner feed: recent driver reports across the whole fleet' })
  reports(@Request() req) {
    return this.tripReportService.listForCompany(req.user?.companyId || req.user?.sub);
  }

  @Get('trips/:tripId/reports')
  @ApiOperation({ summary: 'Owner view: driver reports (incidents/expenses) for a trip' })
  tripReports(@Param('tripId') tripId: string, @Request() req) {
    return this.tripReportService.listForOperator(tripId, req.user?.companyId || req.user?.sub);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Operator dashboard: fleet + bookings + revenue + occupancy' })
  async dashboard(@Request() req) {
    const companyId = req.user?.companyId || req.user?.sub;
    const buses = await this.busService.findByCompany(companyId);
    const routes = await this.routeService.findAll();
    const stats = await this.bookingService.getOperatorStats(companyId);
    return {
      totalBuses: buses.length,
      activeBuses: buses.filter((b) => b.isActive).length,
      totalRoutes: routes.length,
      ...stats, // totalTrips, upcomingTrips, totalBookings, todayBookings, totalRevenue, occupancyPct
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
