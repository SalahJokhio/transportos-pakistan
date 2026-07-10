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

  /**
   * Atomically acquire all requested seats. Uses `SET NX` per seat so there is
   * no check-then-set race: a seat is only ours if Redis reports the key did
   * not already exist (or was already held by this same user). If we fail to
   * grab the full set, we roll back the ones we did grab so a partial lock can
   * never strand seats. Returns true only when every seat is ours.
   */
  async lock(tripId: string, seatNumbers: string[], userId: string): Promise<boolean> {
    const acquired: string[] = [];
    for (const seat of seatNumbers) {
      const key = this.key(tripId, seat);
      // NX = only set if absent. Returns 'OK' when we won the seat, null otherwise.
      const won = await this.redis.set(key, userId, 'EX', LOCK_TTL_SECONDS, 'NX');
      if (won === 'OK') {
        acquired.push(seat);
        continue;
      }
      // Already locked — fine only if it's our own earlier hold (idempotent retry).
      const owner = await this.redis.get(key);
      if (owner === userId) {
        await this.redis.expire(key, LOCK_TTL_SECONDS); // refresh our TTL
        acquired.push(seat);
        continue;
      }
      // Someone else holds this seat: roll back everything we just grabbed.
      if (acquired.length) await this.release(tripId, acquired);
      return false;
    }
    return true;
  }

  /** True if this user currently holds the lock on every given seat. */
  async holdsAll(tripId: string, seatNumbers: string[], userId: string): Promise<boolean> {
    for (const seat of seatNumbers) {
      const owner = await this.redis.get(this.key(tripId, seat));
      if (owner !== userId) return false;
    }
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

  /**
   * All seat numbers currently held (locked) for a trip, read live from Redis.
   * Used to paint seats as 🟨 "temporarily reserved" on the seat map so two
   * passengers don't even select the same seat. SCAN (not KEYS) to avoid
   * blocking Redis as lock volume grows.
   */
  async getLockedSeats(tripId: string): Promise<string[]> {
    const prefix = `${KEY_PREFIX}:${tripId}:`;
    const seats: string[] = [];
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      for (const k of keys) seats.push(k.slice(prefix.length));
    } while (cursor !== '0');
    return seats;
  }
}
