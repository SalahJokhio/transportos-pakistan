import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SecurityService } from '../services/security.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Security Center: 2FA management + login history. */
@ApiTags('Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('security')
export class SecurityController {
  constructor(private readonly svc: SecurityService) {}

  private uid(req: any): string { return req.user?.sub || req.user?.id; }

  @Get('status') status(@Request() req) { return this.svc.status(this.uid(req)); }
  @Post('2fa/setup') setup(@Request() req) { return this.svc.setup2fa(this.uid(req)); }
  @Post('2fa/enable') enable(@Body() b: { code: string }, @Request() req) { return this.svc.enable2fa(this.uid(req), b?.code); }
  @Post('2fa/disable') disable(@Body() b: { code: string }, @Request() req) { return this.svc.disable2fa(this.uid(req), b?.code); }
  @Get('login-history') history(@Request() req) { return this.svc.loginHistory(this.uid(req)); }
}
