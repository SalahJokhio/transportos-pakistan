import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** Enterprise Knowledge Base console + retrieval. */
@ApiTags('Knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly kb: KnowledgeService) {}

  private scope(req: any): string | null {
    if (req.user?.role === 'SUPER_ADMIN') return null;
    return req.user?.companyId || req.user?.sub || null;
  }

  @Get()
  @ApiOperation({ summary: 'List knowledge articles' })
  list(@Query('category') category: string, @Request() req) {
    return this.kb.list(this.scope(req), category);
  }

  @Post()
  @ApiOperation({ summary: 'Add a knowledge article (SOP/policy/FAQ)' })
  create(@Body() body: any, @Request() req) {
    return this.kb.create(this.scope(req), body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() patch: any) {
    return this.kb.update(id, patch);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kb.remove(id);
  }

  @Get('search/q')
  @ApiOperation({ summary: 'Retrieve relevant articles for a query (RAG)' })
  search(@Query('q') q: string, @Request() req) {
    return this.kb.retrieve(this.scope(req), q || '');
  }
}
