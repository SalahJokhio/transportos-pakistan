/// <reference types="jest" />
import 'reflect-metadata';
import { DataSource, QueryFailedError } from 'typeorm';
import { BookingSeat } from '../../src/entities/booking-seat.entity';

/**
 * The real double-booking proof (architecture doc §4/§5, "layer 2").
 *
 * The unit specs mock the database; this one uses a real Postgres so the
 * partial UNIQUE index `uq_confirmed_seat` is actually built and actually
 * enforced. It proves the single most important invariant in the whole system:
 * two bookings can co-exist as HELD, but only ONE can become CONFIRMED for the
 * same (trip, seat) — the second confirmer is rejected by the DB itself.
 *
 * Opt-in: needs a Postgres. Run with:
 *   RUN_DB_TESTS=1 DATABASE_HOST=localhost DATABASE_USER=postgres \
 *   DATABASE_PASSWORD=postgres DATABASE_NAME=transport_os_test npm test
 * Skipped automatically otherwise, so CI without a DB stays green.
 */
const dbDescribe = process.env.RUN_DB_TESTS ? describe : describe.skip;

dbDescribe('Seat concurrency (real Postgres — partial unique index)', () => {
  let ds: DataSource;
  const TRIP = 'trip-concurrency-test';
  const SEAT = '3A';

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT || 5432),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'transport_os_test',
      entities: [BookingSeat],
      synchronize: true, // builds the table + the partial unique index
    });
    await ds.initialize();
  }, 30_000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.getRepository(BookingSeat).delete({ tripId: TRIP });
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    await ds.getRepository(BookingSeat).delete({ tripId: TRIP });
  });

  it('lets two bookings hold the same seat while both are HELD', async () => {
    const repo = ds.getRepository(BookingSeat);
    await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-1', status: 'HELD' }));
    await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-2', status: 'HELD' }));

    const held = await repo.count({ where: { tripId: TRIP, seatNumber: SEAT, status: 'HELD' } });
    expect(held).toBe(2); // contention is allowed; corruption is not
  });

  it('allows the first booking to CONFIRM the seat', async () => {
    const repo = ds.getRepository(BookingSeat);
    const row = await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-1', status: 'HELD' }));
    await repo.update(row.id, { status: 'CONFIRMED' });

    const confirmed = await repo.count({ where: { tripId: TRIP, seatNumber: SEAT, status: 'CONFIRMED' } });
    expect(confirmed).toBe(1);
  });

  it('rejects the SECOND booking that tries to CONFIRM the same seat', async () => {
    const repo = ds.getRepository(BookingSeat);
    const first = await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-1', status: 'HELD' }));
    const second = await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-2', status: 'HELD' }));

    await repo.update(first.id, { status: 'CONFIRMED' }); // winner

    let violation: unknown;
    try {
      await repo.update(second.id, { status: 'CONFIRMED' }); // loser — DB must block
    } catch (err) {
      violation = err;
    }

    expect(violation).toBeInstanceOf(QueryFailedError);
    expect((violation as any).code).toBe('23505'); // unique_violation

    // And the seat is confirmed exactly once — never twice.
    const confirmed = await repo.count({ where: { tripId: TRIP, seatNumber: SEAT, status: 'CONFIRMED' } });
    expect(confirmed).toBe(1);
  });

  it('lets the seat be re-confirmed after the winner cancels (index releases)', async () => {
    const repo = ds.getRepository(BookingSeat);
    const first = await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-1', status: 'HELD' }));
    const second = await repo.save(repo.create({ tripId: TRIP, seatNumber: SEAT, bookingId: 'bk-2', status: 'HELD' }));

    await repo.update(first.id, { status: 'CONFIRMED' });
    await repo.update(first.id, { status: 'CANCELLED' }); // frees the partial index
    await repo.update(second.id, { status: 'CONFIRMED' }); // now allowed

    const confirmed = await repo.count({ where: { tripId: TRIP, seatNumber: SEAT, status: 'CONFIRMED' } });
    expect(confirmed).toBe(1);
  });
});
