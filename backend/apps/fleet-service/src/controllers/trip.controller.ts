import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TripService } from '../services/trip.service';
import { CreateTripDto, SearchTripsDto } from '../dto/fleet.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Trips')
@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule a trip (operator)' })
  create(@Body() dto: CreateTripDto, @Request() req) {
    return this.tripService.create(dto, req.user?.companyId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search available trips' })
  search(@Query() query: SearchTripsDto) {
    return this.tripService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip details' })
  findOne(@Param('id') id: string) {
    return this.tripService.findById(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get seat availability map' })
  seatMap(@Param('id') id: string) {
    return this.tripService.getSeatMap(id);
  }
}
