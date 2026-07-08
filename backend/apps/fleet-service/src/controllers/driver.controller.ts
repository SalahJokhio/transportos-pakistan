import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TripService } from '../services/trip.service';
import { DriverRecordService } from '../services/driver-record.service';
import { TripStatus } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../entities/trip.entity';

@ApiTags('Driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('driver')
export class DriverController {
  constructor(
    private readonly tripService: TripService,
    private readonly driverRecordService: DriverRecordService,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'This driver\'s full record (trips, routes, km, experience, rating)' })
  profile(@Request() req) {
    return this.driverRecordService.getRecord(req.user?.sub);
  }

  @Post('trips/:id/start')
  @ApiOperation({ summary: 'Driver starts the trip (marks DEPARTED + stamps actual departure)' })
  startTrip(@Param('id') id: string, @Request() req) {
    return this.tripService.driverUpdateStatus(id, req.user?.sub, 'start');
  }

  @Post('trips/:id/end')
  @ApiOperation({ summary: 'Driver ends the trip (marks ARRIVED + stamps actual arrival)' })
  endTrip(@Param('id') id: string, @Request() req) {
    return this.tripService.driverUpdateStatus(id, req.user?.sub, 'end');
  }

  @Get('trips')
  @ApiOperation({ summary: 'Get today\'s trips assigned to this driver' })
  async myTrips(@Request() req) {
    const driverId = req.user?.sub;
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    return this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.driverId = :driverId', { driverId })
      .andWhere('trip.departureTime BETWEEN :start AND :end', { start, end })
      .andWhere('trip.status IN (:...statuses)', {
        statuses: [TripStatus.SCHEDULED, TripStatus.BOARDING, TripStatus.DEPARTED, TripStatus.IN_TRANSIT],
      })
      .orderBy('trip.departureTime', 'ASC')
      .getMany();
  }
}
