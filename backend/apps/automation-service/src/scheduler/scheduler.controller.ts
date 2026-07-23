import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Scheduling + Automation Engine console. */
@ApiTags('Scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  private scope(req: any): string | null {
    if (req.user?.role === 'SUPER_ADMIN') return null;
    return req.user?.companyId || req.user?.sub || null;
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List scheduled jobs' })
  list(@Request() req) { return this.scheduler.list(this.scope(req)); }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a scheduled job' })
  create(@Body() body: any, @Request() req) { return this.scheduler.create(this.scope(req), body); }

  @Post('install-defaults')
  @ApiOperation({ summary: 'Install the standard automation jobs' })
  install() { return this.scheduler.installDefaults(); }

  @Post('jobs/:id/run')
  @ApiOperation({ summary: 'Run a job now' })
  run(@Param('id') id: string) { return this.scheduler.runNow(id); }

  @Patch('jobs/:id/toggle')
  toggle(@Param('id') id: string) { return this.scheduler.toggle(id); }

  @Delete('jobs/:id')
  remove(@Param('id') id: string) { return this.scheduler.remove(id); }
}
