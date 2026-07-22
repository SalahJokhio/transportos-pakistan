import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Approval Workflow Engine console. Operators design chains for their tenant;
 * a SUPER_ADMIN works on platform-wide templates. Approvers act on their inbox.
 */
@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  private actor(req: any) {
    const role = req.user?.role;
    const companyId = role === 'SUPER_ADMIN' ? null : (req.user?.companyId || req.user?.sub || null);
    return { userId: req.user?.sub || req.user?.id, role, companyId };
  }

  // ── definitions ────────────────────────────────────────────────────
  @Get('definitions')
  @ApiOperation({ summary: 'List approval-chain templates (own + platform)' })
  listDefinitions(@Request() req) {
    return this.workflows.listDefinitions(this.actor(req).companyId);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create an approval-chain template' })
  createDefinition(@Body() body: any, @Request() req) {
    return this.workflows.createDefinition(this.actor(req).companyId, body);
  }

  @Patch('definitions/:id')
  updateDefinition(@Param('id') id: string, @Body() patch: any) {
    return this.workflows.updateDefinition(id, patch);
  }

  @Delete('definitions/:id')
  removeDefinition(@Param('id') id: string) {
    return this.workflows.removeDefinition(id);
  }

  // ── instances ──────────────────────────────────────────────────────
  @Post('instances')
  @ApiOperation({ summary: 'Start a request against a definition' })
  start(@Body() body: any, @Request() req) {
    return this.workflows.start(this.actor(req), body);
  }

  @Get('instances')
  @ApiOperation({ summary: 'List requests (?status=PENDING|APPROVED|…)' })
  listInstances(@Query('status') status: string, @Request() req) {
    return this.workflows.listInstances(this.actor(req).companyId, status);
  }

  @Get('instances/inbox')
  @ApiOperation({ summary: 'Requests awaiting my role’s approval' })
  inbox(@Request() req) {
    return this.workflows.inbox(this.actor(req));
  }

  @Get('instances/:id')
  getInstance(@Param('id') id: string) {
    return this.workflows.getInstance(id);
  }

  @Post('instances/:id/approve')
  approve(@Param('id') id: string, @Body() body: { note?: string }, @Request() req) {
    return this.workflows.act(this.actor(req), id, 'approve', body?.note);
  }

  @Post('instances/:id/reject')
  reject(@Param('id') id: string, @Body() body: { note?: string }, @Request() req) {
    return this.workflows.act(this.actor(req), id, 'reject', body?.note);
  }

  @Post('instances/:id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.workflows.cancel(this.actor(req), id);
  }
}
