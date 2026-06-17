import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RouteService } from '../services/route.service';
import { CreateRouteDto } from '../dto/fleet.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Routes')
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create route (operator)' })
  create(@Body() dto: CreateRouteDto, @Request() req) {
    return this.routeService.create(dto, req.user?.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'List all routes' })
  findAll() {
    return this.routeService.findAll();
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get all served cities' })
  getCities() {
    return this.routeService.getCities();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route details' })
  findOne(@Param('id') id: string) {
    return this.routeService.findById(id);
  }
}
