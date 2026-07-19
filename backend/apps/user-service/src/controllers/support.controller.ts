import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from '../services/support.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Passenger/agent-facing: raise a support ticket and see your own. */
@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Raise a support ticket' })
  create(@Body() body: any, @Request() req) {
    return this.supportService.create(body, {
      id: req.user?.sub,
      name: req.user?.name,
      phone: req.user?.phone,
    });
  }
}
