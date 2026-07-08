import { Controller, Get, Post, Param, Body, Request, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DriverRecordService } from '../services/driver-record.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Public + cross-company driver record surface. A bus company can verify a
 * driver by CNIC before hiring; passengers/operators can leave portable
 * reviews that stay attached to the driver.
 */
@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driverRecordService: DriverRecordService) {}

  @Get('verify')
  @ApiOperation({ summary: 'Verify a driver by CNIC — full portable record (for hiring companies)' })
  verify(@Query('cnic') cnic: string) {
    return this.driverRecordService.verifyByCnic(cnic);
  }

  @Get(':driverId/record')
  @ApiOperation({ summary: 'Public driver record by id' })
  record(@Param('driverId') driverId: string) {
    return this.driverRecordService.getRecord(driverId);
  }

  @Post(':driverId/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a rating + remark on a driver (attaches to their record)' })
  review(
    @Param('driverId') driverId: string,
    @Body() body: { rating: number; remark?: string; byName?: string; tripId?: string },
    @Request() req,
  ) {
    return this.driverRecordService.addReview(driverId, {
      rating: body.rating,
      remark: body.remark,
      tripId: body.tripId,
      byUserId: req.user?.sub,
      byName: body.byName,
    });
  }
}
