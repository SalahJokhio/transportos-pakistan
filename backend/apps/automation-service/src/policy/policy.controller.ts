import { Controller, Get, Put, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PolicyService } from './policy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Policy Engine console: configurable operating limits + violation checks. */
@ApiTags('Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('policies')
export class PolicyController {
  constructor(private readonly policies: PolicyService) {}

  private scope(req: any): string | null {
    if (req.user?.role === 'SUPER_ADMIN') return null;
    return req.user?.companyId || req.user?.sub || null;
  }

  @Get()
  @ApiOperation({ summary: 'Effective policy values (defaults + platform + tenant)' })
  get(@Request() req) {
    return this.policies.get(this.scope(req));
  }

  @Put()
  @ApiOperation({ summary: 'Update policy values for this scope' })
  update(@Body() body: Record<string, number>, @Request() req) {
    return this.policies.update(this.scope(req), body);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check a value against policy (emits POLICY_VIOLATION on breach)' })
  check(@Body() body: { type: string; value: number; context?: any }, @Request() req) {
    return this.policies.check(this.scope(req), body.type, body.value, body.context);
  }
}
