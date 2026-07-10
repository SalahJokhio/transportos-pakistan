import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Wallet balance, loyalty points and recent transactions' })
  wallet(@Request() req) {
    return this.walletService.getWallet(req.user?.sub ?? req.user?.id);
  }

  @Post('topup')
  @ApiOperation({ summary: 'Top up the wallet' })
  topup(@Body() body: { amount: number }, @Request() req) {
    return this.walletService.topup(req.user?.sub ?? req.user?.id, body.amount);
  }

  @Post('redeem-points')
  @ApiOperation({ summary: 'Redeem loyalty points into wallet credit (1 pt = Rs 1)' })
  redeem(@Body() body: { points: number }, @Request() req) {
    return this.walletService.redeemPoints(req.user?.sub ?? req.user?.id, body.points);
  }
}
