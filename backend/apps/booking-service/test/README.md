# Booking-service tests

The booking engine is the crown jewel — its job is that **two passengers can
never get the same seat**. These tests pin that guarantee at two layers.

## Unit tests (`test/unit`) — always run, no infra

Run in CI on every commit. No Postgres, no Redis.

```bash
npx jest apps/booking-service/test/unit
```

- `seat-lock.service.spec.ts` — layer 1 (Redis `SET NX` lock): atomic grab,
  roll-back of a partial multi-seat lock, idempotent re-lock, live-hold reads,
  and a two-caller race where exactly one wins. Uses an in-memory ioredis fake.
- `booking.service.spec.ts` — guard branches: can't book without holding the
  lock, can't book an already-sold seat, a DB unique violation surfaces as a
  clean `409 Conflict`, and confirming an already-confirmed booking is a no-op
  (payment-webhook-retry safe).
- `pricing.service.spec.ts` — fare math: seat multiplication, 16% GST, promo
  discount ordering, rounding.

## Integration test (`test/integration`) — opt-in, needs Postgres

`seat-concurrency.spec.ts` proves layer 2 for real: it stands up the actual
`booking_seats` table with the partial unique index `uq_confirmed_seat` and
shows the database itself rejecting the second booking that tries to CONFIRM a
seat already CONFIRMED by another. It **auto-skips** unless `RUN_DB_TESTS` is set,
so a DB-less CI stays green.

```bash
# bash
RUN_DB_TESTS=1 DATABASE_HOST=localhost DATABASE_USER=postgres \
DATABASE_PASSWORD=postgres DATABASE_NAME=transport_os_test \
npx jest apps/booking-service/test/integration
```

```powershell
# PowerShell
$env:RUN_DB_TESTS=1; $env:DATABASE_NAME='transport_os_test'
npx jest apps/booking-service/test/integration
```

Point it at a throwaway database — it uses `synchronize` and cleans up its own
rows, but don't aim it at anything you care about.
