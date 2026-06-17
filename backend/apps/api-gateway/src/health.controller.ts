import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return {
      status: 'ok',
      service: 'TransportOS API Gateway',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
