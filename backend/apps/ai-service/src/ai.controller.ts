import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PricingAiService } from './pricing-ai.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly pricing: PricingAiService) {}

  @Get('price-suggestion/:tripId')
  @ApiOperation({ summary: 'Demand-based dynamic pricing suggestion for a trip' })
  priceSuggestion(@Param('tripId') tripId: string) {
    return this.pricing.suggestForTrip(tripId);
  }
}
