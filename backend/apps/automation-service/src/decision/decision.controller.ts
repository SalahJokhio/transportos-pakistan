import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DecisionService } from './decision.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/** AI Decision Engine — coordinated dispatch recommendations. */
@ApiTags('Decisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('decisions')
export class DecisionController {
  constructor(private readonly decisions: DecisionService) {}

  @Post('delay/:tripId')
  @ApiOperation({ summary: 'Handle a delayed trip → affected passengers + alternative vehicle' })
  delay(@Param('tripId') tripId: string) {
    return this.decisions.handleDelay(tripId);
  }
}
