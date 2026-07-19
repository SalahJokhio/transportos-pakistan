import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BookingService } from './services/booking.service';

/** Public funnel-event tracking (fired from the client before/after login). */
@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('funnel')
  @ApiOperation({ summary: 'Record a booking-funnel step (search/seat_select/pay_start/pay_done)' })
  funnel(@Body() body: { stage: string; sessionId?: string; tripId?: string; userId?: string }) {
    return this.bookingService.recordFunnel(body.stage, body);
  }
}
