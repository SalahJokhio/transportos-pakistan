import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispatch')
class DispatchController {
  constructor(private readonly svc: DispatchService) {}
  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }
  @Get('board')
  @ApiOperation({ summary: 'Live dispatch board: today’s trips + alerts + summary' })
  board(@Request() req) { return this.svc.board(this.scope(req)); }
}

/** Dispatcher Console live-ops board. */
@Module({
  imports: [TypeOrmModule.forFeature([Trip, Route, Bus, Booking, AutomationAlert])],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
