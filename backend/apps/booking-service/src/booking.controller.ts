import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingService } from './services/booking.service';
import { SeatLockService } from './services/seat-lock.service';
import { PricingService } from './services/pricing.service';
import { TicketService } from './services/ticket.service';
import { ShiftService } from './services/shift.service';
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
    private readonly ticketService: TicketService,
    private readonly shiftService: ShiftService,
  ) {}

  // ---- Counter/agent POS: cash shifts (#15) ----------------------------

  @Get('shift/current')
  @ApiOperation({ summary: 'The agent’s currently open shift (if any)' })
  currentShift(@Request() req) {
    return this.shiftService.current(req.user?.sub);
  }

  @Post('shift/open')
  @ApiOperation({ summary: 'Open a counter cash shift' })
  openShift(@Body() body: { openingCash?: number }, @Request() req) {
    return this.shiftService.open(req.user?.sub, req.user?.companyId || req.user?.sub, body?.openingCash || 0);
  }

  @Post('shift/close')
  @ApiOperation({ summary: 'Close shift with cash reconciliation (variance)' })
  closeShift(@Body() body: { closingCash?: number }, @Request() req) {
    return this.shiftService.close(req.user?.sub, body?.closingCash || 0);
  }

  @Get('shift/history')
  @ApiOperation({ summary: 'Past shifts for this agent' })
  shiftHistory(@Request() req) {
    return this.shiftService.history(req.user?.sub);
  }

  @Post(':id/collect-cash')
  @ApiOperation({ summary: 'Counter agent collects cash → confirm a COUNTER reservation (#5 COD)' })
  collectCash(@Param('id') id: string) {
    return this.bookingService.collectCash(id);
  }

  @Get('ticket/:pnr')
  @ApiOperation({ summary: 'Full e-ticket: booking + trip/route/bus + scannable QR' })
  ticket(@Param('pnr') pnr: string) {
    return this.ticketService.getTicket(pnr);
  }

  @Post(':tripId/notify-arrival')
  @ApiOperation({ summary: 'Geofenced arrival: SMS all confirmed passengers on a trip' })
  notifyArrival(@Param('tripId') tripId: string) {
    return this.bookingService.notifyArrival(tripId);
  }

  @Get('verify/:pnr')
  @ApiOperation({ summary: 'Conductor-side ticket verification (PNR + signature)' })
  verify(@Param('pnr') pnr: string, @Query('sig') sig: string) {
    return this.ticketService.verify(pnr, sig);
  }

  @Post('board/:pnr')
  @ApiOperation({ summary: 'QR boarding check-in — verify + stamp boarded (#7)' })
  board(@Param('pnr') pnr: string, @Body() body: { sig: string }) {
    return this.ticketService.board(pnr, body?.sig);
  }

  @Get('manifest/:tripId')
  @ApiOperation({ summary: 'Operator boarding manifest (passenger list for a trip)' })
  manifest(@Param('tripId') tripId: string, @Request() req) {
    return this.bookingService.getManifest(tripId, req.user?.sub);
  }

  @Get('seat-map/:tripId')
  @ApiOperation({ summary: 'Seat map with live lock state merged (AVAILABLE/LOCKED/BOOKED)' })
  seatMap(@Param('tripId') tripId: string) {
    return this.bookingService.getSeatMap(tripId);
  }

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

  @Post('agent')
  @ApiOperation({ summary: 'Agent issues a walk-in ticket on behalf of a customer' })
  createByAgent(@Body() dto: CreateBookingDto, @Request() req) {
    return this.bookingService.createByAgent(dto, req.user?.sub);
  }

  @Get('agent/summary')
  @ApiOperation({ summary: 'Agent earnings: tickets issued + commission' })
  agentSummary(@Request() req) {
    return this.bookingService.getAgentSummary(req.user?.sub);
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
