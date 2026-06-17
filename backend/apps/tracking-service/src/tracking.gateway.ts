import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface LocationCache {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/tracking' })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private readonly locationCache = new Map<string, LocationCache>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('track:trip')
  async handleTrackTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const room = `trip:${data.tripId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);

    // Send last known location immediately if available
    const cached = this.locationCache.get(data.tripId);
    if (cached) {
      client.emit('bus:location', { tripId: data.tripId, ...cached });
    }

    return { event: 'tracking:started', tripId: data.tripId };
  }

  @SubscribeMessage('untrack:trip')
  async handleUntrackTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    await client.leave(`trip:${data.tripId}`);
    return { event: 'tracking:stopped', tripId: data.tripId };
  }

  @SubscribeMessage('driver:location')
  handleLocation(
    @MessageBody() data: { tripId: string; lat: number; lng: number; speed?: number; heading?: number },
  ) {
    const payload: LocationCache = {
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      heading: data.heading,
      timestamp: new Date(),
    };

    // Cache latest location for late-joining clients
    this.locationCache.set(data.tripId, payload);

    // Broadcast to all passengers watching this trip
    this.server.to(`trip:${data.tripId}`).emit('bus:location', {
      tripId: data.tripId,
      ...payload,
    });

    return { event: 'ack', data: 'Location received' };
  }

  // Called by REST controller to broadcast location from HTTP driver updates
  broadcastLocation(tripId: string, lat: number, lng: number, speed?: number, heading?: number) {
    const payload: LocationCache = { lat, lng, speed, heading, timestamp: new Date() };
    this.locationCache.set(tripId, payload);
    this.server.to(`trip:${tripId}`).emit('bus:location', { tripId, ...payload });
  }
}
