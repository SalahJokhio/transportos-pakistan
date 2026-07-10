# TravelOS / SafarHub — System Architecture & Build Plan
### Pakistan's Transport Operating System
*Prepared as an engineering blueprint, not a pitch deck — this is what actually needs to be true for the system to work in production.*

---

## 1. The Core Engineering Truth First

Before architecture: this product has **one hard problem** that determines whether it works or not.

> **Two passengers cannot be sold the same seat on the same bus.**

Everything else (UI, AI, tracking, admin panels) is replaceable or can be mediocre at launch and still work. This one thing — **seat inventory correctness under concurrency** — cannot be mediocre. If it breaks even once publicly (two people show up with the same seat on the same bus), trust in the platform dies in one viral tweet. So the architecture below is built outward from that constraint.

Second hard problem: **money**. Payment failures, double-charges, and refund mismatches are the #2 trust-killer. Both of these get dedicated sections below.

---

## 2. Recommended Tech Stack (with reasoning)

You used **Next.js + Node/Express + MongoDB** for THEKEYDAAR — that was right for a marketplace (loosely structured listings, no strict transactional integrity needed). **TravelOS is different**: it's a transactional booking engine, closer to a banking system than a marketplace. The stack should reflect that.

| Layer | Choice | Why |
|---|---|---|
| Passenger/Driver apps | **React Native** (not separate iOS/Android) | One codebase, you're a solo/small team |
| Web (Passenger, Agent, Company, Admin) | **Next.js** | You already know it; SSR good for SEO on route pages |
| Backend | **NestJS** (Node, TypeScript) | Express is fine for THEKEYDAAR-scale; this needs structured modules, dependency injection, and built-in support for queues/microservices as you scale |
| Primary Database | **PostgreSQL**, not MongoDB | Seat booking needs ACID transactions + row-level locking. Mongo makes "prevent double-booking" *your* problem to solve manually. Postgres makes it the database's job. This is the single most important stack decision in this whole document. |
| Cache / Locking | **Redis** | Seat locks, session cache, live GPS cache |
| Event Queue | **Redis Streams** at MVP → **RabbitMQ/Kafka** post-scale | Decouple booking → payment → notification → tracking |
| Time-series (GPS history) | **TimescaleDB** (Postgres extension) | Don't reinvent — extend the DB you already have |
| File/Image storage | **Cloudinary** (you already use it) | Fine, no change needed |
| Maps | **Google Maps Platform** (Directions, Distance Matrix) | As planned |
| Realtime | **Socket.IO** | As planned, for live tracking + seat-status updates |
| Hosting (MVP) | **Railway** (backend) + **Vercel** (frontend) | Matches your THEKEYDAAR setup, keep consistency |
| Hosting (scale) | Migrate backend to **AWS/GCP** once you cross ~50 buses live | Railway won't hold at fleet-tracking scale |

---

## 3. System Architecture

```
                         ┌─────────────────────────┐
                         │   Clients                │
                         │ Passenger App / Web       │
                         │ Agent Portal              │
                         │ Company Portal            │
                         │ Driver App                │
                         │ Admin / Control Center     │
                         └────────────┬─────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │   API Gateway            │
                          │ (auth, rate-limit, route) │
                          └───────────┬────────────┘
                                      │
        ┌──────────┬──────────┬──────┴───┬───────────┬─────────────┐
        ▼          ▼          ▼          ▼           ▼             ▼
   ┌────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
   │Identity│ │Booking  │ │Payment │ │Fleet/   │ │Tracking │ │Notify    │
   │Service │ │Service  │ │Service │ │Route Svc│ │Service  │ │Service   │
   └────────┘ └────┬────┘ └───┬────┘ └─────────┘ └────┬────┘ └──────────┘
                    │          │                       │
                    ▼          ▼                       ▼
              ┌──────────────────────┐         ┌──────────────┐
              │  PostgreSQL (primary) │         │ Redis (live   │
              │  + Redis (seat locks) │         │ GPS + cache)  │
              └──────────────────────┘         └──────────────┘
                    │
                    ▼
          ┌────────────────────┐
          │ Event Bus (Redis    │──→ feeds: Notification, Analytics, Fraud
          │ Streams / RabbitMQ) │
          └────────────────────┘
```

Each box above is a **module**, not necessarily a separately deployed service on day one. Build it as a modular monolith (NestJS modules) first; split into real microservices only when one module's load genuinely demands independent scaling (Tracking is usually the first to split, because GPS ingestion volume scales differently than booking volume).

---

## 4. The Seat-Locking Problem — Solved

This is the part most "transport app" tutorials skip. Here's the actual flow:

1. Passenger selects seat 3B → backend places a **Redis lock**: `lock:trip:8842:seat:3B` with a **5-minute TTL**, value = passenger's session ID.
2. If lock already exists (someone else holds it) → seat shows as 🟨 *temporarily reserved*, not bookable.
3. Passenger proceeds to payment. On successful payment webhook:
   - Postgres transaction: `INSERT INTO bookings ... WHERE NOT EXISTS (confirmed booking for this seat)` — this is the real safety net, the database constraint, not just the Redis lock (Redis lock prevents *contention*, Postgres constraint prevents *corruption* if Redis ever lies).
   - Redis lock deleted.
4. If payment fails or TTL expires → lock auto-expires → seat returns to 🟩 available, broadcast via Socket.IO to anyone viewing that trip.

This two-layer approach (Redis for speed/UX, Postgres unique constraint for truth) is the standard pattern airlines/bus systems actually use. Skipping the Postgres-level constraint and trusting Redis alone is how double-bookings happen in real systems.

---

## 5. Core Database Schema (essentials only)

```sql
companies (id, name, status, commission_rate, created_at)
buses (id, company_id, registration_no, total_seats, seat_map_json, amenities)
routes (id, company_id, origin, destination, stops_json, distance_km)
trips (id, route_id, bus_id, driver_id, departure_at, arrival_at, base_fare, status)
seats (id, trip_id, seat_no, status, locked_until, locked_by)
bookings (id, trip_id, seat_id, passenger_id, pnr, status, fare_paid, created_at)
   UNIQUE CONSTRAINT (trip_id, seat_id) WHERE status = 'confirmed'   -- the real safety net
payments (id, booking_id, provider, provider_ref, amount, status, idempotency_key)
   UNIQUE (idempotency_key)   -- prevents double-charge on retry
drivers (id, name, cnic, license_no, assigned_bus_id, status)
gps_logs (id, trip_id, lat, lng, speed, recorded_at)   -- TimescaleDB hypertable
agents (id, name, company_affiliation, commission_balance)
```

The two `UNIQUE` constraints above are doing the real protective work in this entire system — more than any amount of frontend validation.

---

## 6. Payment Layer — Idempotency

Pakistani payment rails (Easypaisa, JazzCash, card via Safepay/PayFast) all have one shared risk: **network timeout doesn't mean the payment failed** — it might have succeeded on their end and the response just didn't reach you. Handle this with:

- Every payment request carries a client-generated **idempotency key**.
- If the same key is retried, return the original result — never charge twice.
- A reconciliation job runs every few minutes: cross-check `payments` table against the provider's transaction report API, auto-flag mismatches for manual review.

---

## 7. Real-Time Tracking Pipeline

```
Driver App (every 5-10 sec)
   → POST /tracking/ping {lat, lng, speed, trip_id}
   → Tracking Service writes to Redis (latest position, fast reads)
   → Async write to TimescaleDB (gps_logs, for history/replay/analytics)
   → Broadcast via Socket.IO to all clients subscribed to trip_id
        → Passenger app updates live map
        → Family-tracking link updates
        → Control Center dashboard updates
```

At scale (thousands of buses), this ping volume is the heaviest write load in the whole system — this is exactly why GPS history goes to TimescaleDB (built for high-frequency time-series writes) rather than your main Postgres tables.

---

## 8. Visual Theme (refined)

Your original palette is good — banking-grade trust colors are the right call for a payment-heavy app. Small refinements:

| Token | Color | Use |
|---|---|---|
| Primary | `#0F172A` (Deep Navy) | Headers, nav, primary buttons |
| Secondary | `#2563EB` (Royal Blue) | Links, active states, CTAs |
| Accent | `#F59E0B` (Amber) | Highlights, "limited seats left" urgency cues |
| Success | `#22C55E` | Confirmed booking, available seat |
| Danger | `#EF4444` | Booked seat, errors, cancellations |
| Background | `#F8FAFC` | App background |
| Surface | `#FFFFFF` | Cards |
| Text Muted | `#64748B` | Secondary text |

Seat map colors stay exactly as you designed (🟩 available / 🟥 booked / 🟨 reserved / 🟦 selected) — that's intuitive and shouldn't change.

One addition: use the **Amber accent** for scarcity signals ("Only 3 seats left") — this is a proven conversion lever in booking UX (Booking.com, Daewoo's own site use this) and costs nothing extra to build since you already track seat counts live.

---

## 9. Realistic Phased Roadmap

Your original doc has 13 modules across "Phase 1–4." As a solo/small-team founder, building all of that before launch means you never launch. Here's the build order that gets something **real and revenue-generating** in front of users fastest:

### Phase 0 — Foundation (3–4 weeks)
- Auth (passenger, company, agent, admin roles)
- Company onboarding (manual admin-approved at first, no self-serve needed yet)
- Route + Trip + Seat-map CRUD (company portal, basic)
- Core Postgres schema + seat-locking logic live and tested

### Phase 1 — MVP, Revenue-Capable (6–8 weeks)
- Passenger: search → seat selection → checkout → payment → ticket (QR + PDF)
- One real payment provider integrated properly (not three — pick JazzCash or Easypaisa first, add the rest later)
- SMS ticket confirmation (skip WhatsApp/Push at first — SMS is universal in Pakistan and simplest to integrate)
- **Goal: onboard 1–2 real bus companies and sell real tickets.** Everything below this line is justified by what you learn here.

### Phase 2 — Operations (4–6 weeks)
- Driver app: start/end trip, GPS ping
- Live tracking on passenger app + family-share link
- Agent portal (manual ticket issuing for walk-in customers)
- Basic Control Center (live map of active trips)

### Phase 3 — Intelligence (ongoing, after real data exists)
- Dynamic fare suggestions (needs real booking-pattern data first — building this on zero data is guessing, not AI)
- Demand forecasting for Eid/seasonal rushes
- Fraud detection on bookings/agents

### Phase 4 — Expansion
- Train module (only after bus side is stable and profitable)
- Flight module
- Cargo / Hotel / Tourism — true "super app" territory, multi-year horizon

---

## 10. The Honest Engineering Risk

You're describing something with the operational complexity of an airline reservation system, built by what's currently a solo/small team. That's not a reason not to build it — but it is a reason to be ruthless about **Phase 1 scope**. The single biggest failure mode for projects like this isn't bad code — it's trying to build all 13 modules in parallel and never shipping the one that generates revenue (booking + payment + ticket). Get one bus company actually selling real tickets through this before touching the Control Center or AI layer.

If useful, I can next produce: the actual NestJS module folder structure, or the Postgres migration files for the schema above, ready to drop into a repo.
