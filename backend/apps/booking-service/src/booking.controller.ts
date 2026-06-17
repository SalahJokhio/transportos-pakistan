import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingService } from './services/booking.service';
import { SeatLockService } from './services/seat-lock.service';
import { PricingService } from './services/pricing.service';
import { CreateBookingDto, CancelBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly seatLockService: SeatLockService,
    private readonly pricingService: PricingService,
  ) {}

  @Post('lock-seats')
  @ApiOperation({ summary: 'Lock seats before payment (10 min hold)' })
  async lockSeats(@Body() body: { tripId: string; seatNumbers: string[] }, @Request() req) {
    const locked = await this.seatLockService.lock(body.tripId, body.seatNumbers, req.user?.sub);
    if (!locked) return { success: false, message: 'One or more seats already taken' };
    return { success: true, message: 'Seats locked for 10 minutes' };
  }

  @Post()
  @ApiOperation({ summary: 'Create booking (after locking seats)' })
  create(@Body() dto: CreateBookingDto, @Request() req) {
    return this.bookingService.create(dto, req.user?.sub);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get my bookings' })
  myBookings(@Request() req) {
    return this.bookingService.getUserBookings(req.user?.sub);
  }

  @Get('pnr/:pnr')
  @ApiOperation({ summary: 'Get booking by PNR' })
  findByPnr(@Param('pnr') pnr: string) {
    return this.bookingService.findByPnr(pnr);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  findOne(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking after payment (triggers loyalty earn)' })
  confirm(@Param('id') id: string, @Body() body: { paymentId: string }) {
    return this.bookingService.confirm(id, body.paymentId);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  cancel(@Param('id') id: string, @Body() dto: CancelBookingDto, @Request() req) {
    return this.bookingService.cancel(id, dto, req.user?.sub);
  }
}
