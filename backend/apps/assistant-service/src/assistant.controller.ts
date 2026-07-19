import { Controller, Post, Body, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Booking assistant chat (Claude when configured, else rules)' })
  chat(@Body() body: { message: string; history?: any[] }) {
    return this.assistant.chat(body.message, body.history || []);
  }

  @Post('whatsapp')
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Twilio WhatsApp webhook (creds-only to go live)' })
  whatsapp(@Body() body: any) {
    return this.assistant.whatsapp(body);
  }
}
