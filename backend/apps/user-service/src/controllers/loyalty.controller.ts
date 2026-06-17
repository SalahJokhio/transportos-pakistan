import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoyaltyService } from '../services/loyalty.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current loyalty points balance' })
  getBalance(@Request() req) {
    return this.loyaltyService.getBalance(req.user.sub);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get loyalty transaction history' })
  getHistory(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.loyaltyService.getHistory(req.user.sub, Number(page || 1), Number(limit || 20));
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem loyalty points against a booking' })
  redeem(@Request() req, @Body() body: { points: number; bookingId?: string }) {
    return this.loyaltyService.redeemPoints(req.user.sub, body.points, body.bookingId);
  }
}
