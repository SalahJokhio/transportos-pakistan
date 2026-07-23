import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CareService } from './care.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Customer care: Lost & Found + Emergency SOS. */
@ApiTags('Care')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('care')
export class CareController {
  constructor(private readonly care: CareService) {}

  private uid(req: any): string { return req.user?.sub || req.user?.id; }

  @Post('lost-found')
  @ApiOperation({ summary: 'Report a lost item' })
  reportLost(@Body() body: any, @Request() req) { return this.care.reportLost(this.uid(req), body); }

  @Get('lost-found/mine')
  @ApiOperation({ summary: 'My lost-item reports' })
  lostMine(@Request() req) { return this.care.listLostMine(this.uid(req)); }

  @Post('sos')
  @ApiOperation({ summary: 'Raise an emergency SOS' })
  sos(@Body() body: any, @Request() req) { return this.care.raiseSos(this.uid(req), body); }

  @Get('sos/mine')
  @ApiOperation({ summary: 'My SOS events' })
  sosMine(@Request() req) { return this.care.listSosMine(this.uid(req)); }
}
