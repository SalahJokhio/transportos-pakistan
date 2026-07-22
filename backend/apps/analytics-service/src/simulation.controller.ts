import { Controller, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SimulationService } from './simulation.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Digital Twin — "what-if" scenario analysis over the real operation. */
@ApiTags('Simulation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('simulate')
export class SimulationController {
  constructor(private readonly sim: SimulationService) {}

  private scope(req: any): string | undefined {
    if (req.user?.role === 'SUPER_ADMIN') return undefined;
    return req.user?.companyId || req.user?.sub || undefined;
  }

  @Post(':scenario')
  @ApiOperation({ summary: 'Run a what-if scenario (demand_spike|fuel_price|route_closure|new_route)' })
  run(@Param('scenario') scenario: string, @Body() params: any, @Request() req) {
    return this.sim.run(scenario, params, this.scope(req));
  }
}
