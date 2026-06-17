import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrackingGateway } from './tracking.gateway';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly gateway: TrackingGateway) {}

  @Post('location')
  @ApiOperation({ summary: 'Driver updates bus GPS location (REST fallback)' })
  updateLocation(@Body() body: { tripId: string; lat: number; lng: number; speed?: number; heading?: number }) {
    this.gateway.broadcastLocation(body.tripId, body.lat, body.lng, body.speed, body.heading);
    return { received: true, tripId: body.tripId, timestamp: new Date() };
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
