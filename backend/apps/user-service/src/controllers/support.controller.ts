import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from '../services/support.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Passenger-facing: raise, view, reply to and rate your own support tickets. */
@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  private uid(req: any): string { return req.user?.sub || req.user?.id; }

  @Post('tickets')
  @ApiOperation({ summary: 'Raise a support ticket' })
  create(@Body() body: any, @Request() req) {
    return this.supportService.create(body, { id: this.uid(req), name: req.user?.name, phone: req.user?.phone });
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'My support tickets' })
  mine(@Request() req) { return this.supportService.listMine(this.uid(req)); }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'One of my tickets (with conversation)' })
  one(@Param('id') id: string, @Request() req) { return this.supportService.getMine(id, this.uid(req)); }

  @Post('tickets/:id/reply')
  @ApiOperation({ summary: 'Reply to my ticket' })
  reply(@Param('id') id: string, @Body() body: { body: string }, @Request() req) {
    return this.supportService.customerReply(id, this.uid(req), body?.body || '');
  }

  @Post('tickets/:id/rate')
  @ApiOperation({ summary: 'Rate a resolved ticket (CSAT 1–5)' })
  rate(@Param('id') id: string, @Body() body: { rating: number; comment?: string }, @Request() req) {
    return this.supportService.rate(id, this.uid(req), body?.rating, body?.comment);
  }
}
