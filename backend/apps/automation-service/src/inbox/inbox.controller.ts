import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** In-app notification inbox for the signed-in user. */
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  private uid(req: any): string { return req.user?.sub || req.user?.id; }

  @Get()
  @ApiOperation({ summary: 'My in-app notifications' })
  list(@Request() req) { return this.inbox.list(this.uid(req)); }

  @Get('unread-count')
  @ApiOperation({ summary: 'My unread count' })
  unread(@Request() req) { return this.inbox.unreadCount(this.uid(req)); }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Request() req) { return this.inbox.markRead(id, this.uid(req)); }

  @Post('read-all')
  markAllRead(@Request() req) { return this.inbox.markAllRead(this.uid(req)); }
}
