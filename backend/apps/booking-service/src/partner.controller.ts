import { Controller, Get, Post, Delete, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../../fleet-service/src/entities/trip.entity';
import { TicketService } from './services/ticket.service';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Public partner API — external operators/agents integrate via an API key. */
@ApiTags('Partner API')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('partner')
export class PartnerController {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    private readonly ticketService: TicketService,
  ) {}

  @Get('trips/search')
  @ApiOperation({ summary: 'Search trips (partner)' })
  search(@Query('originCity') origin: string, @Query('destinationCity') destination: string, @Query('date') date: string) {
    return this.tripRepo.query(
      `SELECT t.id, t."departureTime", t."basePrice", r."originCity" AS origin, r."destinationCity" AS destination
       FROM trips t JOIN routes r ON r.id::text = t."routeId"
       WHERE lower(r."originCity") = lower($1) AND lower(r."destinationCity") = lower($2)
         AND t."departureTime"::date = $3::date ORDER BY t."departureTime" LIMIT 20`,
      [origin, destination, date],
    );
  }

  @Get('ticket/:pnr')
  @ApiOperation({ summary: 'Look up a ticket by PNR (partner)' })
  ticket(@Param('pnr') pnr: string) {
    return this.ticketService.getTicket(pnr);
  }
}

/** Operator-facing API-key management. */
@ApiTags('Partner API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a partner API key' })
  create(@Body() body: { name?: string }, @Request() req) {
    return this.apiKeyService.create(req.user?.companyId || req.user?.sub, body?.name);
  }

  @Get()
  list(@Request() req) {
    return this.apiKeyService.list(req.user?.companyId || req.user?.sub);
  }

  @Delete(':id')
  revoke(@Param('id') id: string, @Request() req) {
    return this.apiKeyService.revoke(id, req.user?.companyId || req.user?.sub);
  }
}
