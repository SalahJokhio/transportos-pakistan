import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExecutiveCopilotService } from './executive-copilot.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Executive AI Copilot — natural-language questions over the operation. */
@ApiTags('Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('copilot')
export class ExecutiveCopilotController {
  constructor(private readonly copilot: ExecutiveCopilotService) {}

  /** SUPER_ADMIN → platform-wide; operators → their own company. */
  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Post('ask')
  @ApiOperation({ summary: 'Ask a natural-language question about the business' })
  ask(@Body() body: { question: string }, @Request() req) {
    return this.copilot.ask(body?.question ?? '', this.scope(req));
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'The KPI snapshot the copilot reasons over' })
  snapshot(@Request() req) {
    return this.copilot.snapshot(this.scope(req));
  }
}
