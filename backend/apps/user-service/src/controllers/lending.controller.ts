import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LendingService } from '../services/lending.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Operator-facing working-capital lending. */
@ApiTags('Lending')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lending')
export class LendingController {
  constructor(private readonly lending: LendingService) {}

  @Get('offer')
  @ApiOperation({ summary: 'Your advance offer (based on ticket revenue)' })
  offer(@Request() req) {
    return this.lending.offer(req.user?.companyId || req.user?.sub);
  }

  @Post('request')
  @ApiOperation({ summary: 'Request a working-capital advance' })
  request(@Body() body: { amount: number }, @Request() req) {
    return this.lending.request(req.user?.companyId || req.user?.sub, Number(body?.amount) || 0);
  }

  @Get()
  @ApiOperation({ summary: 'Your loans' })
  list(@Request() req) {
    return this.lending.list(req.user?.companyId || req.user?.sub);
  }
}
