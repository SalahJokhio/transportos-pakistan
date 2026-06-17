import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusService } from '../services/bus.service';
import { CreateBusDto } from '../dto/fleet.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Buses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buses')
export class BusController {
  constructor(private readonly busService: BusService) {}

  @Post()
  @ApiOperation({ summary: 'Register a bus' })
  create(@Body() dto: CreateBusDto, @Request() req) {
    return this.busService.create(dto, req.user?.companyId);
  }

  @Get('my-fleet')
  @ApiOperation({ summary: 'Get company fleet' })
  myFleet(@Request() req) {
    return this.busService.findByCompany(req.user?.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bus details' })
  findOne(@Param('id') id: string) {
    return this.busService.findById(id);
  }
}
