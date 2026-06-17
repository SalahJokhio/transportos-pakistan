import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const LOCK_TTL_SECONDS = 600; // 10 minutes
const KEY_PREFIX = 'seat_lock';

@Injectable()
export class SeatLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SeatLockService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redis.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    this.redis.connect().catch((err) => this.logger.warn(`Redis connect failed, falling back to memory: ${err.message}`));
  }

  onModuleDestroy() {
    this.redis?.quit();
  }

  private key(tripId: string, seatNumber: string) {
    return `${KEY_PREFIX}:${tripId}:${seatNumber}`;
  }

  async lock(tripId: string, seatNumbers: string[], userId: string): Promise<boolean> {
    // Check all seats first — atomic check then set
    for (const seat of seatNumbers) {
      const existing = await this.redis.get(this.key(tripId, seat));
      if (existing && existing !== userId) return false;
    }

    // Use pipeline for atomic multi-set with TTL
    const pipeline = this.redis.pipeline();
    for (const seat of seatNumbers) {
      pipeline.set(this.key(tripId, seat), userId, 'EX', LOCK_TTL_SECONDS);
    }
    await pipeline.exec();
    return true;
  }

  async release(tripId: string, seatNumbers: string[]): Promise<void> {
    const keys = seatNumbers.map((s) => this.key(tripId, s));
    if (keys.length) await this.redis.del(...keys);
  }

  async isLocked(tripId: string, seatNumber: string, userId?: string): Promise<boolean> {
    const val = await this.redis.get(this.key(tripId, seatNumber));
    if (!val) return false;
    if (userId && val === userId) return false;
    return true;
  }

  async getLockedBy(tripId: string, seatNumber: string): Promise<string | null> {
    return this.redis.get(this.key(tripId, seatNumber));
  }

  async getTtl(tripId: string, seatNumber: string): Promise<number> {
    return this.redis.ttl(this.key(tripId, seatNumber));
  }
}
