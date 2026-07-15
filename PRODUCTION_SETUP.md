# TransportOS — Production Setup Guide

This is the step-by-step checklist to take TransportOS from the local demo to a
live, money-handling deployment for Pakistan. Work top to bottom; nothing here
requires re-architecting the app — every integration point already exists in code
and is wired to environment variables.

> **Golden rule:** never commit secrets. Everything below goes into the hosting
> provider's env-var UI (or a `.env` that is git-ignored), never into the repo.

---

## 0. Overview of what you'll wire up

| Concern            | Local (now)                    | Production (target)                        |
|--------------------|--------------------------------|--------------------------------------------|
| Database           | Local Postgres, `synchronize`  | Managed Postgres + migrations              |
| Cache / seat locks | Local Redis                    | Managed Redis (Upstash / Redis Cloud)      |
| Payments           | Mock gateway → auto-confirm    | JazzCash + EasyPaisa merchant              |
| File uploads       | `./uploads` on disk            | Cloudinary (or S3)                         |
| SMS (PNR/OTP)      | Logged to console              | Telenor / Jazz SMS API or Twilio           |
| Hosting            | `node` + `next dev` on laptop  | Railway/Render (API) + Vercel (web)        |
| Auth secret        | `transport-os-secret` default  | Strong random `JWT_SECRET`                 |

---

## 1. Managed database & Redis

### Postgres
1. Create a managed Postgres (Railway, Neon, Supabase, or RDS). Pakistan latency
   is best from Singapore/Mumbai regions.
2. Copy the connection string into the API env as `DATABASE_URL` (or the discrete
   `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME` the app already reads).
3. **Migrations are already the source of truth.** `synchronize` now defaults to
   **false** (see `libs/database/src/database.module.ts`), so production never
   silently alters/drops a column on live bookings. A baseline migration for the
   full schema already exists at `libs/database/src/migrations/`. Apply it on the
   prod DB before first boot:
     ```bash
     cd backend
     npm run migration:run          # applies pending migrations
     # to add a migration later, after changing entities:
     npm run migration:generate -- libs/database/src/migrations/<Name>
     ```
   - Leave `DATABASE_SYNCHRONIZE` unset in production (defaults to false). Only set
     `DATABASE_SYNCHRONIZE=true` for fast local dev.
   - **Do not skip the partial unique index** that guarantees one confirmed seat
     per trip — verify it exists after migrating:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_seat_confirmed
       ON bookings ("tripId", "seatNumber")
       WHERE status = 'CONFIRMED';
     ```

### Redis
1. Create a managed Redis (Upstash is serverless and cheap; Redis Cloud works too).
2. Set `REDIS_URL` (or `REDIS_HOST/REDIS_PORT/REDIS_PASSWORD`).
3. Redis is **not** just a cache here — it holds the atomic `SET NX` seat locks.
   Use a plan with persistence; if Redis is wiped mid-sale you lose in-flight
   holds (the DB unique index still prevents double-booking, but users would see
   more "seat taken" races).

---

## 2. Strong secrets

```bash
# generate a 64-char secret
openssl rand -hex 32
```

Set on the API:
- `JWT_SECRET` — the value above (replaces the `transport-os-secret` default).
- `JWT_EXPIRES_IN` — access token TTL (default `15m`; refresh flow already exists).

If `JWT_SECRET` stays at the default in production, anyone can forge admin tokens.
This is the single most important line in this document.

---

## 3. Payments — JazzCash & EasyPaisa

The payment-service already has a gateway abstraction and an idempotent confirm
(`idempotencyKey` defaults to `bookingId`, so a double-callback can't double-charge
or double-confirm). You are swapping the mock gateway for the real merchant HTTP calls.

### JazzCash (HBL / Mobilink merchant)
1. Apply for a **JazzCash Merchant account** (business registration + bank account
   required). You receive: `MerchantID`, `Password`, and an **Integrity Salt**.
2. Set env:
   ```
   JAZZCASH_MERCHANT_ID=...
   JAZZCASH_PASSWORD=...
   JAZZCASH_INTEGRITY_SALT=...
   JAZZCASH_RETURN_URL=https://api.yourdomain.com/api/v1/payments/jazzcash/callback
   JAZZCASH_ENV=production        # 'sandbox' while testing
   ```
3. JazzCash uses an **HMAC-SHA256 secure hash** over the sorted request fields
   using the Integrity Salt. Compute it server-side in the payment-service before
   redirecting the user to JazzCash's hosted page. Verify the same hash on the
   callback before you call `confirmBooking` — never trust an unverified callback.
4. Test in **sandbox** first with JazzCash's test wallet/card, confirm a booking
   flips to `CONFIRMED` exactly once, then switch `JAZZCASH_ENV=production`.

### EasyPaisa (Telenor Microfinance)
1. Apply for an **EasyPaisa Merchant / "Easypay"** account. You receive a
   `storeId` and API credentials.
2. Set env:
   ```
   EASYPAISA_STORE_ID=...
   EASYPAISA_ACCOUNT=...
   EASYPAISA_HASH_KEY=...
   EASYPAISA_RETURN_URL=https://api.yourdomain.com/api/v1/payments/easypaisa/callback
   EASYPAISA_ENV=production
   ```
3. Same pattern: signed request → hosted/redirect flow → verify signature on the
   callback → idempotent `confirmBooking`.

### Payment testing checklist (do all before go-live)
- [ ] Sandbox happy path: pay → booking `CONFIRMED`, seat released from lock.
- [ ] **Double callback**: fire the same callback twice → still one confirmation,
      one payment row (idempotencyKey does its job).
- [ ] Failed/cancelled payment → booking stays `PENDING_PAYMENT`, seat lock expires,
      seat becomes available again.
- [ ] Refund path → wallet credit or gateway refund recorded as a `REFUND`
      wallet transaction / payment reversal.

---

## 4. File uploads — Cloudinary

Right now `POST /uploads` writes to `./uploads` on the API box (fine for a laptop,
lost on every redeploy of an ephemeral host). Move media (incident photos, driver
CV docs, expense receipts) to Cloudinary.

1. Create a free **Cloudinary** account → Dashboard gives `cloud_name`,
   `api_key`, `api_secret`.
2. Set env:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   STORAGE_DRIVER=cloudinary       # 'disk' keeps the local behaviour
   ```
3. In the upload controller, swap Multer's `diskStorage` for a Cloudinary upload
   (the `multer-storage-cloudinary` package plugs straight into the existing
   `FileInterceptor`). Return the Cloudinary `secure_url` instead of the local
   `/uploads/...` path — the mobile app and web already just render whatever `url`
   the endpoint returns, so no client change is needed.
4. Keep the 25 MB limit; add `allowed_formats: [jpg, png, mp4, pdf]`.

---

## 5. SMS — PNR & OTP delivery

The app "sends" the booking SMS and OTP by logging them. For real delivery pick one:

- **Telenor / Jazz corporate SMS API** — cheapest per-SMS in Pakistan, needs a
  business masking (sender ID) approval from PTA. Best for volume.
- **Twilio** — instant to set up, works globally, more expensive per SMS. Good to
  launch with, migrate to a local gateway later.

Set env and implement in the notification path:
```
SMS_DRIVER=twilio                 # or 'telenor' / 'log'
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+1...                 # or your approved masking sender ID
```
Keep `SMS_DRIVER=log` in staging so you don't spend credits on test bookings.

---

## 6. Hosting

### API (NestJS modular monolith)
- **Railway** or **Render** — both run the api-gateway as a single web service.
- Build: `cd backend && npm ci && npx nest build api-gateway`
- Start: `node dist/apps/api-gateway/main`
- Set the health check to `GET /api/v1/health`.
- Attach the managed Postgres + Redis from steps 1.
- Set **all** env vars from steps 1–5.

### Web (Next.js 14)
- **Vercel** — connect the repo, root = `frontend`.
- Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`.
- Vercel builds `next build` automatically.

### Mobile (Flutter driver app)
- Build a release APK/AAB pointing at production:
  ```bash
  flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1
  ```
- The token-refresh interceptor and persistent GPS foreground service already
  work against any base URL. Ship the AAB to Play Console (needs the background
  location justification — the app tracks the bus for passengers).

### CORS & headers
- Set the API's allowed origin to the web domain (`CORS_ORIGIN=https://yourdomain.com`).
- Helmet is already on with `crossOriginResourcePolicy:false` so uploaded media
  renders cross-origin — keep that once media moves to Cloudinary (Cloudinary URLs
  are cross-origin by nature).

---

## 7. Go-live checklist

- [ ] `DATABASE_SYNCHRONIZE` unset (defaults false) and `npm run migration:run` applied on prod DB.
- [ ] Partial unique index `uq_trip_seat_confirmed` confirmed present.
- [ ] `JWT_SECRET` is a real random value, not the default.
- [ ] JazzCash + EasyPaisa passed the sandbox + double-callback tests.
- [ ] Uploads land in Cloudinary; a redeploy doesn't lose media.
- [ ] Real SMS delivering PNR + OTP to a Pakistani number.
- [ ] Health check green on the API host; web can reach the API (no CORS errors).
- [ ] Seed a real operator/admin; **delete all demo seed users** (the `Admin1234!`
      / `Driver123!` / `Pass123!` accounts must not exist in production).
- [ ] Backups enabled on Postgres (point-in-time recovery for bookings/payments).

---

## 8. Recommended launch order

1. Deploy API + web with managed DB/Redis and real `JWT_SECRET` — no payments yet,
   run bookings in "reserve, pay at counter" mode.
2. Add SMS so passengers get their PNR.
3. Add JazzCash (largest wallet reach in PK), verify end-to-end with real Rs 10 test.
4. Add EasyPaisa as the second option.
5. Move uploads to Cloudinary before promoting the driver incident/expense feature.
6. Turn on card payments last if you add a card gateway.

Everything above maps to an existing env var or a single swap in an existing
service — there is no rewrite between the demo and production.
