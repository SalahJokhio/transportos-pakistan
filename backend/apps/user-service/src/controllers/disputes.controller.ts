import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DisputeService } from '../services/dispute.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @ApiOperation({ summary: 'Raise a dispute / refund request / fraud report' })
  create(@Body() body: { type: string; subject: string; description?: string; bookingId?: string; pnr?: string }, @Request() req) {
    return this.disputeService.create(req.user?.sub ?? req.user?.id, body);
  }

  @Get('mine')
  @ApiOperation({ summary: 'My disputes' })
  mine(@Request() req) {
    return this.disputeService.listMine(req.user?.sub ?? req.user?.id);
  }
}
