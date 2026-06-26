import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './services/tracking.service';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly gateway: TrackingGateway,
    private readonly trackingService: TrackingService,
  ) {}

  @Post('location')
  @ApiOperation({ summary: 'Driver updates bus GPS location (broadcast + persist)' })
  async updateLocation(@Body() body: { tripId: string; lat: number; lng: number; speed?: number; heading?: number }) {
    // Broadcast live to watchers, then persist for history/replay.
    this.gateway.broadcastLocation(body.tripId, body.lat, body.lng, body.speed, body.heading);
    await this.trackingService.record(body.tripId, body.lat, body.lng, body.speed, body.heading);
    return { received: true, tripId: body.tripId, timestamp: new Date() };
  }

  @Get(':tripId/history')
  @ApiOperation({ summary: 'GPS trail for a trip (replay / analytics)' })
  history(@Param('tripId') tripId: string, @Query('limit') limit?: string) {
    return this.trackingService.getHistory(tripId, limit ? Number(limit) : 500);
  }

  @Get(':tripId/location')
  @ApiOperation({ summary: 'Get latest cached bus location for a trip' })
  getLocation(@Param('tripId') tripId: string) {
    // Return from in-memory cache via gateway
    const cached = (this.gateway as any).locationCache?.get(tripId);
    if (!cached) {
      return { tripId, lat: null, lng: null, updatedAt: null, message: 'No location data yet' };
    }
    return { tripId, ...cached, updatedAt: cached.timestamp };
  }
}
