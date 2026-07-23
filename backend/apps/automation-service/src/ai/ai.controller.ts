import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** AI Memory (personalization) + Governance (feedback loop). */
@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  private uid(req: any): string { return req.user?.sub || req.user?.id; }

  @Get('memory/me')
  @ApiOperation({ summary: 'My AI personalization profile (from booking history)' })
  myMemory(@Request() req) { return this.ai.memoryProfile(this.uid(req)); }

  @Get('memory/:userId')
  @ApiOperation({ summary: 'A user’s AI personalization profile' })
  memory(@Param('userId') userId: string) { return this.ai.memoryProfile(userId); }

  @Post('feedback')
  @ApiOperation({ summary: 'Record accept/reject on an AI suggestion' })
  feedback(@Body() body: { kind: string; refId?: string; accepted: boolean; note?: string }, @Request() req) {
    return this.ai.record(this.uid(req) ?? null, body);
  }

  @Get('feedback/stats')
  @ApiOperation({ summary: 'AI suggestion acceptance stats' })
  stats() { return this.ai.stats(); }
}
