/// <reference types="jest" />
import { SeatLockService, RedisLockStore } from '../../src/services/seat-lock.service';

/**
 * The seat lock is the first line of defence against two passengers grabbing the
 * same seat (architecture doc §4). Two things are proven here:
 *
 *  1. The lock *logic* — atomic set-if-absent, roll-back of a partial multi-seat
 *     grab, idempotent re-locking, a two-caller race — exercised against the
 *     service's real in-memory store (the same code path used when Redis is down).
 *  2. The Redis adapter's NX semantics, exercised against an ioredis fake.
 *
 * No real Redis needed, so this runs in CI on every commit.
 */

describe('SeatLockService (double-booking defence — layer 1)', () => {
  let service: SeatLockService;
  const TRIP = 'trip-1';
  const USER_A = 'user-a';
  const USER_B = 'user-b';

  beforeEach(() => {
    // No onModuleInit → no Redis. The service falls back to its in-memory store,
    // which is exactly the degraded path we want covered.
    service = new SeatLockService({ get: () => undefined } as any);
  });

  it('grants free seats to the first caller', async () => {
    expect(await service.lock(TRIP, ['3A', '3B'], USER_A)).toBe(true);
    expect(await service.holdsAll(TRIP, ['3A', '3B'], USER_A)).toBe(true);
  });

  it('refuses a seat already held by another user', async () => {
    await service.lock(TRIP, ['3A'], USER_A);
    expect(await service.lock(TRIP, ['3A'], USER_B)).toBe(false);
    expect(await service.holdsAll(TRIP, ['3A'], USER_B)).toBe(false);
  });

  // The important one: a partial grab must never strand seats. If B can't get
  // the whole set, the seats B *did* manage to grab have to be released so a
  // third passenger isn't blocked by a lock nobody owns a booking for.
  it('rolls back every seat when one seat in the requested set is taken', async () => {
    await service.lock(TRIP, ['3B'], USER_A); // A holds 3B
    // B asks for [3A, 3B] — 3A is free, 3B is A's. B must fail AND not keep 3A.
    expect(await service.lock(TRIP, ['3A', '3B'], USER_B)).toBe(false);

    expect(await service.getLockedBy(TRIP, '3A')).toBeNull(); // rolled back
    expect(await service.getLockedBy(TRIP, '3B')).toBe(USER_A); // untouched
  });

  it('is idempotent for the same owner and refreshes the TTL', async () => {
    await service.lock(TRIP, ['3A'], USER_A);
    // Re-locking your own held seat must succeed, not fail as "taken".
    expect(await service.lock(TRIP, ['3A'], USER_A)).toBe(true);
    const ttl = await service.getTtl(TRIP, '3A');
    expect(ttl).toBeGreaterThan(0);
  });

  it('holdsAll is true only when the caller owns every seat', async () => {
    await service.lock(TRIP, ['3A'], USER_A);
    await service.lock(TRIP, ['3B'], USER_B);
    expect(await service.holdsAll(TRIP, ['3A', '3B'], USER_A)).toBe(false);
    expect(await service.holdsAll(TRIP, ['3A'], USER_A)).toBe(true);
  });

  it('release frees a seat so another passenger can lock it', async () => {
    await service.lock(TRIP, ['3A'], USER_A);
    await service.release(TRIP, ['3A']);
    expect(await service.lock(TRIP, ['3A'], USER_B)).toBe(true);
  });

  it('getLockedSeats reports live holds so the seat map can paint them reserved', async () => {
    await service.lock(TRIP, ['3A', '4C'], USER_A);
    const locked = (await service.getLockedSeats(TRIP)).sort();
    expect(locked).toEqual(['3A', '4C']);
  });

  it('two callers racing for the same seat: exactly one wins', async () => {
    const [a, b] = await Promise.all([
      service.lock(TRIP, ['9D'], USER_A),
      service.lock(TRIP, ['9D'], USER_B),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1); // one true, one false
  });

  // The bug this fix closes: with Redis down the service must still hand out
  // holds (degraded, single-instance) instead of throwing on every call.
  it('keeps working when Redis is unavailable (degraded in-memory mode)', async () => {
    // onModuleInit was never called, so there is no Redis connection at all.
    expect(await service.lock(TRIP, ['1A'], USER_A)).toBe(true);
    expect(await service.lock(TRIP, ['1A'], USER_B)).toBe(false);
    expect(await service.getTtl(TRIP, '1A')).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

// Minimal, faithful ioredis stand-in — only the commands RedisLockStore calls.
class FakeRedis {
  private store = new Map<string, { value: string; expireAt: number }>();

  private live(key: string) {
    const e = this.store.get(key);
    if (e && e.expireAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return this.store.get(key);
  }
  async set(key: string, value: string, _ex: 'EX', ttl: number, _nx: 'NX') {
    if (this.live(key)) return null; // NX: refuse if a live key already exists
    this.store.set(key, { value, expireAt: Date.now() + ttl * 1000 });
    return 'OK';
  }
  async get(key: string) {
    return this.live(key)?.value ?? null;
  }
  async del(...keys: string[]) {
    for (const k of keys) this.store.delete(k);
    return keys.length;
  }
  async expire(key: string, ttl: number) {
    const e = this.live(key);
    if (e) e.expireAt = Date.now() + ttl * 1000;
    return 1;
  }
  async ttl(key: string) {
    const e = this.live(key);
    return e ? Math.ceil((e.expireAt - Date.now()) / 1000) : -2;
  }
  async scan(_cursor: string, _m: 'MATCH', pattern: string, _c: 'COUNT', _n: number): Promise<[string, string[]]> {
    const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return ['0', [...this.store.keys()].filter((k) => this.live(k) && re.test(k))];
  }
}

describe('RedisLockStore (Redis SET NX semantics)', () => {
  let store: RedisLockStore;

  beforeEach(() => {
    store = new RedisLockStore(new FakeRedis() as any);
  });

  it('setNx succeeds once then refuses while the key lives', async () => {
    expect(await store.setNx('k', 'a', 600)).toBe(true);
    expect(await store.setNx('k', 'b', 600)).toBe(false);
    expect(await store.get('k')).toBe('a');
  });

  it('del removes the key so it can be set again', async () => {
    await store.setNx('k', 'a', 600);
    await store.del(['k']);
    expect(await store.setNx('k', 'b', 600)).toBe(true);
  });

  it('scanPrefix returns every live key under the prefix', async () => {
    await store.setNx('seat_lock:t1:3A', 'a', 600);
    await store.setNx('seat_lock:t1:3B', 'a', 600);
    await store.setNx('seat_lock:t2:1A', 'a', 600);
    const keys = (await store.scanPrefix('seat_lock:t1:')).sort();
    expect(keys).toEqual(['seat_lock:t1:3A', 'seat_lock:t1:3B']);
  });
});
