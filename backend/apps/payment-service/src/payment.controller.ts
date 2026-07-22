import { Controller, Post, Body, Get, All, Param, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard, Roles } from './guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for a booking from the wallet' })
  payWithWallet(@Body() body: { bookingId: string }, @Request() req) {
    return this.paymentService.payWithWallet(body.bookingId, req.user?.sub);
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate JazzCash / EasyPaisa payment (idempotent per booking)' })
  initiate(@Body() body: { bookingId: string; method: 'jazzcash' | 'easypaisa'; idempotencyKey?: string }) {
    return this.paymentService.initiate(body.bookingId, body.method, body.idempotencyKey);
  }

  @Post('mock-confirm')
  @ApiOperation({ summary: 'DEV: simulate a successful payment and confirm the booking' })
  mockConfirm(@Body() body: { bookingId: string }) {
    return this.paymentService.mockConfirm(body.bookingId);
  }

  @Post('jazzcash/callback')
  @ApiOperation({ summary: 'JazzCash payment callback' })
  jazzcashCallback(@Body() body: any) {
    return this.paymentService.handleJazzCashCallback(body);
  }

  @Post('easypaisa/callback')
  @ApiOperation({ summary: 'EasyPaisa payment callback' })
  easypaisaCallback(@Body() body: any) {
    return this.paymentService.handleEasypaisaCallback(body);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get payment status' })
  status(@Param('id') id: string) {
    return this.paymentService.getStatus(id);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @Roles('SUPER_ADMIN', 'FINANCE_OFFICER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment (full or partial) — wallet or gateway' })
  refund(@Param('id') id: string, @Body() body: { amount?: number; reason?: string }) {
    return this.paymentService.refund(id, body?.amount, body?.reason);
  }

  @Post('reconcile')
  @UseGuards(JwtAuthGuard)
  @Roles('SUPER_ADMIN', 'FINANCE_OFFICER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reconcile stuck PENDING/PROCESSING payments against the gateway' })
  reconcile(@Body() body: { olderThanMinutes?: number }) {
    return this.paymentService.reconcile(body?.olderThanMinutes);
  }

  /**
   * Browser return URL for the gateways (set as JAZZCASH/EASYPAISA_RETURN_URL).
   * The gateway redirects the passenger here (GET or POST); we settle and then
   * bounce them to their e-ticket, or to the checkout-retry page on failure.
   */
  @All('return/:provider')
  @ApiOperation({ summary: 'Gateway browser-return: settle then redirect to the ticket' })
  async gatewayReturn(
    @Param('provider') provider: string,
    @Body() body: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.gatewayReturn(provider, { ...query, ...body });
    const frontend = process.env.FRONTEND_URL || 'http://localhost:4000';
    if (result.status === 'success' && result.pnr) {
      return res.redirect(`${frontend}/booking/${result.pnr}?paid=1`);
    }
    return res.redirect(`${frontend}/checkout/return?status=failed`);
  }
}
