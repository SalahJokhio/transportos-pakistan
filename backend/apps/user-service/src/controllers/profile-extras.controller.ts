import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfileExtrasService } from '../services/profile-extras.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Profile hub: saved travellers, saved addresses, notification preferences. */
@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileExtrasController {
  constructor(private readonly svc: ProfileExtrasService) {}

  private uid(req: any): string { return req.user?.sub || req.user?.id; }

  @Get('travelers') travelers(@Request() req) { return this.svc.listTravelers(this.uid(req)); }
  @Post('travelers') addTraveler(@Body() b: any, @Request() req) { return this.svc.addTraveler(this.uid(req), b); }
  @Patch('travelers/:id') updTraveler(@Param('id') id: string, @Body() b: any, @Request() req) { return this.svc.updateTraveler(id, this.uid(req), b); }
  @Delete('travelers/:id') delTraveler(@Param('id') id: string, @Request() req) { return this.svc.removeTraveler(id, this.uid(req)); }

  @Get('addresses') addresses(@Request() req) { return this.svc.listAddresses(this.uid(req)); }
  @Post('addresses') addAddress(@Body() b: any, @Request() req) { return this.svc.addAddress(this.uid(req), b); }
  @Patch('addresses/:id') updAddress(@Param('id') id: string, @Body() b: any, @Request() req) { return this.svc.updateAddress(id, this.uid(req), b); }
  @Delete('addresses/:id') delAddress(@Param('id') id: string, @Request() req) { return this.svc.removeAddress(id, this.uid(req)); }

  @Get('notification-prefs') getPrefs(@Request() req) { return this.svc.getPrefs(this.uid(req)); }
  @Put('notification-prefs') setPrefs(@Body() b: any, @Request() req) { return this.svc.setPrefs(this.uid(req), b); }
}
