import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StaffAssistantService } from './staff-assistant.service';

/** Layer-1 personal assistants: Driver AI and Mechanic AI. */
@ApiTags('Staff Assistant')
@Controller('assistant')
export class StaffAssistantController {
  constructor(private readonly svc: StaffAssistantService) {}

  @Post('driver')
  @ApiOperation({ summary: 'Driver AI — route/fatigue/fuel/safety/incident help' })
  driver(@Body() body: { message: string; history?: any[] }) {
    return this.svc.chat('driver', body?.message ?? '', body?.history ?? []);
  }

  @Post('mechanic')
  @ApiOperation({ summary: 'Mechanic AI — fault diagnosis + parts guidance' })
  mechanic(@Body() body: { message: string; history?: any[] }) {
    return this.svc.chat('mechanic', body?.message ?? '', body?.history ?? []);
  }
}
