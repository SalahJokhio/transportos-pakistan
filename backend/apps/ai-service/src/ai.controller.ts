import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  @Get('price-suggestion')
  @ApiOperation({ summary: 'Dynamic pricing suggestion for a route' })
  priceSuggestion(@Query('routeId') routeId: string, @Query('date') date: string) {
    // TODO: ML model for demand-based pricing
    return { routeId, date, suggestedMultiplier: 1.0, reason: 'Normal demand' };
  }
}
