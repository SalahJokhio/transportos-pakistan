import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const LOCK_TTL_SECONDS = 600; // 10 minutes
const KEY_PREFIX = 'seat_lock';

/**
 * The subset of key/value operations the seat lock needs. Backed by Redis in
 * production and by an in-process map when Redis is unreachable, so the two
 * implementations are interchangeable and the lock logic lives in one place.
 */
interface LockStore {
  /** Atomic set-if-absent with TTL. True only when we created the key. */
  setNx(key: string, value: string, ttlSec: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  del(keys: string[]): Promise<void>;
  expire(key: string, ttlSec: number): Promise<void>;
  ttl(key: string): Promise<number>;
  /** All live keys beginning with `prefix`. */
  scanPrefix(prefix: string): Promise<string[]>;
}

/** Redis-backed store — the real deal, safe across multiple app instances. */
export class RedisLockStore implements LockStore {
  constructor(private readonly redis: Redis) {}

  async setNx(key: string, value: string, ttlSec: number): Promise<boolean> {
    return (await this.redis.set(key, value, 'EX', ttlSec, 'NX')) === 'OK';
  }
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }
  async del(keys: string[]): Promise<void> {
    if (keys.length) await this.redis.del(...keys);
  }
  async expire(key: string, ttlSec: number): Promise<void> {
    await this.redis.expire(key, ttlSec);
  }
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }
  async scanPrefix(prefix: string): Promise<string[]> {
    // SCAN (not KEYS) so we never block Redis as lock volume grows.
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}

/**
 * In-memory fallback used only when Redis is down. Single-process, so two app
 * instances could each hand out the same seat hold — but that's fine: the Redis
 * lock only prevents *contention* (UX), while the Postgres partial unique index
 * (uq_confirmed_seat) prevents *corruption* (two confirmed bookings). Losing
 * Redis degrades the experience, it never lets a seat be double-sold.
 */
export class MemoryLockStore implements LockStore {
  private readonly store = new Map<string, { value: string; expireAt: number }>();

  private live(key: string): { value: string; expireAt: number } | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expireAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }

  async setNx(key: string, value: string, ttlSec: number): Promise<boolean> {
    if (this.live(key)) return false;
    this.store.set(key, { value, expireAt: Date.now() + ttlSec * 1000 });
    return true;
  }
  async get(key: string): Promise<string | null> {
    return this.live(key)?.value ?? null;
  }
  async del(keys: string[]): Promise<void> {
    for (const k of keys) this.store.delete(k);
  }
  async expire(key: string, ttlSec: number): Promise<void> {
    const e = this.live(key);
    if (e) e.expireAt = Date.now() + ttlSec * 1000;
  }
  async ttl(key: string): Promise<number> {
    const e = this.live(key);
    return e ? Math.ceil((e.expireAt - Date.now()) / 1000) : -2;
  }
  async scanPrefix(prefix: string): Promise<string[]> {
    return [...this.store.keys()].filter((k) => this.live(k) && k.startsWith(prefix));
  }
}

@Injectable()
export class SeatLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SeatLockService.name);
  private redis?: Redis;
  private readonly memory = new MemoryLockStore();
  // Start on the in-memory store so the service is usable even before (or
  // without) a Redis connection — connecting later swaps this to Redis.
  private store: LockStore = this.memory;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    // A later connection drop degrades us back to memory rather than throwing
    // on every command. Correctness still holds via the Postgres constraint.
    redis.on('error', (err) => {
      if (this.store !== this.memory) {
        this.logger.warn(`Redis error — degrading seat lock to in-memory: ${err.message}`);
        this.store = this.memory;
      }
    });

    try {
      await redis.connect();
      this.redis = redis;
      this.store = new RedisLockStore(redis);
      this.logger.log('Seat lock backed by Redis');
    } catch (err: any) {
      // Stop the retry loop from spamming; run degraded on the in-memory store.
      redis.disconnect();
      this.logger.warn(
        `Redis unavailable — seat lock running in-memory (single-instance only). ` +
          `Double-booking is still prevented by the DB. Cause: ${err.message}`,
      );
    }
  }

  onModuleDestroy() {
    this.redis?.quit();
  }

  private key(tripId: string, seatNumber: string) {
    return `${KEY_PREFIX}:${tripId}:${seatNumber}`;
  }

  /**
   * Atomically acquire all requested seats. Uses set-if-absent per seat so there
   * is no check-then-set race: a seat is only ours if the store reports the key
   * did not already exist (or was already held by this same user). If we fail to
   * grab the full set, we roll back the ones we did grab so a partial lock can
   * never strand seats. Returns true only when every seat is ours.
   */
  async lock(tripId: string, seatNumbers: string[], userId: string): Promise<boolean> {
    const acquired: string[] = [];
    for (const seat of seatNumbers) {
      const key = this.key(tripId, seat);
      if (await this.store.setNx(key, userId, LOCK_TTL_SECONDS)) {
        acquired.push(seat);
        continue;
      }
      // Already locked — fine only if it's our own earlier hold (idempotent retry).
      const owner = await this.store.get(key);
      if (owner === userId) {
        await this.store.expire(key, LOCK_TTL_SECONDS); // refresh our TTL
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
      const owner = await this.store.get(this.key(tripId, seat));
      if (owner !== userId) return false;
    }
    return true;
  }

  async release(tripId: string, seatNumbers: string[]): Promise<void> {
    await this.store.del(seatNumbers.map((s) => this.key(tripId, s)));
  }

  async isLocked(tripId: string, seatNumber: string, userId?: string): Promise<boolean> {
    const val = await this.store.get(this.key(tripId, seatNumber));
    if (!val) return false;
    if (userId && val === userId) return false;
    return true;
  }

  async getLockedBy(tripId: string, seatNumber: string): Promise<string | null> {
    return this.store.get(this.key(tripId, seatNumber));
  }

  async getTtl(tripId: string, seatNumber: string): Promise<number> {
    return this.store.ttl(this.key(tripId, seatNumber));
  }

  /**
   * All seat numbers currently held (locked) for a trip. Used to paint seats as
   * 🟨 "temporarily reserved" on the seat map so two passengers don't even
   * select the same seat.
   */
  async getLockedSeats(tripId: string): Promise<string[]> {
    const prefix = `${KEY_PREFIX}:${tripId}:`;
    const keys = await this.store.scanPrefix(prefix);
    return keys.map((k) => k.slice(prefix.length));
  }
}
