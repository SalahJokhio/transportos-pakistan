import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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
}
