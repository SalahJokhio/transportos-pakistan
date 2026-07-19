import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CargoService } from './cargo.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Cargo')
@Controller('cargo')
export class CargoController {
  constructor(private readonly cargo: CargoService) {}

  @Get('track/:trackingNo')
  @ApiOperation({ summary: 'Public parcel tracking' })
  track(@Param('trackingNo') trackingNo: string) {
    return this.cargo.track(trackingNo);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a parcel (auto-priced by weight)' })
  book(@Body() body: any, @Request() req) {
    return this.cargo.book(body, req.user?.companyId || req.user?.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List parcels for the operator' })
  list(@Request() req) {
    return this.cargo.list(req.user?.companyId || req.user?.sub);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update parcel status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.cargo.updateStatus(id, body.status);
  }
}
