# TransportOS — Deep Analysis & Product Strategy

_Prepared 2026-07-16. Covers: current capability inventory, SuperAdmin surface, competitive
teardown (Bookkaru / Bookme / SastaTicket / Faisal Movers–Daewoo), the strategic wedge, and a
prioritized roadmap for the **App**, **Web**, and **OS**._

---

## PART 1 — What TransportOS actually does today

### 1.1 SuperAdmin — current capabilities
From `admin.controller.ts` (`@Roles(SUPER_ADMIN)`):

| Area | What SuperAdmin can do now |
|---|---|
| Users | List/search/filter all users, **change role**, activate/deactivate |
| Operators | List operators, **approve** an operator (promote to COMPANY_ADMIN) |
| Disputes | View dispute/refund/fraud queue, **resolve/reject** a dispute |
| Fraud | See users with suspicious activity (many cancellations) |
| Reporting | Platform-wide **user stats** + **revenue/booking stats** |

That's a solid *platform-admin* base — but it's **oversight only**. It cannot yet run the
business (money movement, catalog, config, compliance). See Part 4 for the SuperAdmin expansion.

### 1.2 Full module map (what works end-to-end)
- **Auth** — phone+password login, JWT + refresh, OTP send/verify, forgot/reset/change password. Registration is **passenger-only by design** (roles granted by admin).
- **Booking (crown jewel)** — trip search, seat map, **atomic seat lock (Redis + Postgres partial unique index)**, booking create, **agent/counter booking**, confirm, cancel, PNR lookup, e-ticket, PNR verify, **trip manifest** for driver/conductor.
- **Pricing** — GST + discount + rounding.
- **Payments** — wallet pay, JazzCash/EasyPaisa initiate (hash + sandbox form), callbacks (JazzCash hash verify implemented), **mock-confirm** bypass, idempotency key. → *scaffolded, not production-certified.*
- **Fleet / Operator OS** — routes, buses, trips (+status), **employees/staff-HR CRUD + payroll stats**, driver assignment, fleet report, operator dashboard.
- **Driver app (Flutter)** — login, active trip, start/end trip, **trip reports (fuel/incident + media)**, live location push.
- **Tracking** — GPS ingest, live location, history (plain Postgres).
- **Notifications** — Twilio SMS (real if configured, else console), OTP, booking confirmation.
- **Loyalty & Wallet** — points balance/history/redeem, wallet topup/redeem.
- **Disputes & Ratings** — passenger dispute filing, driver verify/record/reviews.
- **Web (Next.js, ~28 pages)** — search, book, checkout, ticket, my-bookings, wallet, profile, track, verify-driver, agent counter, driver, and dashboards (admin/operator/staff/drivers/finance/reports).

### 1.3 Honest status — real vs mocked vs missing
| Real & solid | Mocked / sandbox | Missing entirely |
|---|---|---|
| Seat-lock + no-double-book | JazzCash/EasyPaisa (sandbox, mock-confirm) | Passenger **mobile app** (only driver app exists) |
| Booking/agent flow, PNR, manifest | Notifications (console fallback) | AI service (only a price-suggestion stub, **unwired**) |
| Staff/HR module + payroll stats | Analytics service (stub, unwired) | Real settlement/commission engine |
| DB migrations, prod-safe schema | — | Promo/coupon engine, CMS, audit log |
| Role-based auth, admin oversight | — | Refund **execution** (only dispute status), reconciliation |

---

## PART 2 — Market & competitive teardown

### 2.1 There are two different games
- **Aggregator marketplaces (B2C demand-side):** Bookme, Bookkaru, SastaTicket. They sell tickets for *many* operators, take commission, and compete on brand + deals + verticals (flights, hotels, events, cinema).
- **Operator platform (B2B supply-side):** the software a bus *company* uses to run fleet, staff, counters, drivers, tracking, and its *own* branded booking.

**TransportOS is fundamentally the second thing.** The aggregators do **not** give operators fleet/HR/driver-ops/tracking. That gap is the whole opportunity.

### 2.2 Competitor snapshot
| Player | What they are | Strengths | What they DON'T do (our wedge) |
|---|---|---|---|
| **Bookme.pk** | Super-app aggregator | 100+ operators, flights/hotels/events, wallet, **gamified loyalty (coins/badges/leaderboard)**, 24/7 support | No operator-side fleet/HR/ops software |
| **Bookkaru** | Aggregator (powers Faisal Movers et al.) | Multi-modal (bus/train/flight/event), cards/banking/wallets, live bus tracking by reference | Operator is just a *listing*, not a system |
| **SastaTicket.pk** | Aggregator | **Zero-commission** bus tickets, easy cancel/refund, top operators | Same — demand-side only |
| **Faisal Movers / Daewoo** | Operators | Big fleets, rewards program, own booking | Software is outsourced/rented; no unified OS |

Sources: [bookkaru.com](https://bookkaru.com/), [bookme.pk](https://bookme.pk/), [sastaticket.pk/bus](https://www.sastaticket.pk/bus-tickets), [daewoo.com.pk booking guide](https://daewoo.com.pk/Home/online-bus-booking).

### 2.3 Where we win / where we're behind
- **We win (potential):** an *operating system* for the operator — fleet + HR + counters + drivers + GPS + branded booking under one roof. Correct, non-double-booking engine. Pakistan-native building blocks (agent counter, manifest, CNIC, Urdu-ready).
- **We're behind:** no passenger mobile app; payments not production-certified; no promotions/loyalty depth; no support tooling; no multi-operator marketplace; no AI/analytics live.

---

## PART 3 — The strategy (the wedge)

**Don't fight Bookme for demand. Sell the OS to supply.**

1. **Land (B2B SaaS):** target small/mid bus companies (20–200 buses) who today have *nothing* but a Bookkaru listing. Give them fleet + HR + counter + driver app + branded booking as a subscription. This is a market the aggregators structurally ignore.
2. **Expand (own their operations):** once a company runs daily ops on TransportOS, you own their data (trips, occupancy, staff, payments) — high switching cost.
3. **Become the rails (B2B2C):** federate the operators already on the OS into your *own* passenger marketplace/app. Unlike Bookme, your supply is already fully digitized (live seats, live GPS, e-manifest) — a structural quality advantage.

Monetization: SaaS subscription per company + per-active-bus, small booking fee on the operator's own channel, and later marketplace commission — plus payments float/wallet.

---

## PART 4 — Roadmap (prioritized)

### 4.A SuperAdmin — what MORE it should do (the control tower)
Priority order:
1. **Settlement & commission engine** — operator payouts, statements, invoices, ledger. (turns oversight into a business)
2. **Refund execution + reconciliation** — actually move money back to wallet/gateway, match gateway settlements.
3. **Multi-tenant management** — create/suspend companies, plans, seat/bus limits, per-tenant branding.
4. **Promo/coupon & campaign engine** — codes, segments, budgets, expiry.
5. **CMS / catalog** — cities, canonical routes, banners, landing content, fare-rule governor (min/max, surge caps).
6. **Compliance/KYC workflows** — operator onboarding docs, driver licence/CNIC, vehicle fitness & **route-permit** tracking with expiry alerts.
7. **Audit log + RBAC editor** — full admin activity trail; a permission matrix instead of hard-coded roles.
8. **Broadcast center** — push/SMS/WhatsApp/email to segments; service alerts.
9. **Support/ticketing console** — beyond disputes: cases, canned replies, SLA timers.
10. **Fraud rules engine** — configurable velocity/blocklists, not just a cancellation count.
11. **Finance/tax exports** — GST/FBR-ready reports, operator statements, CSV/PDF.
12. **System health** — service status, queue depth, error rates.

### 4.B Wave P0 — "make it real & sellable" (0–6 weeks)
- **App:** ship the **passenger mobile app** (Flutter already has the driver app + API client — reuse it). Even a thin booking+ticket+track app closes the biggest gap.
- **Web:** finish empty dashboards (finance/reports), add role-based nav polish, PWA/offline for counters (load-shedding reality).
- **OS:** **certify one real payment rail** end-to-end (JazzCash *or* EasyPaisa production creds + webhook signature + reconciliation) and wire **real SMS/WhatsApp** booking confirmations. Turn on **refund execution**.

### 4.C Wave P1 — parity + operator delight (6–14 weeks)
- **App:** live seat map, live bus tracking, wallet + loyalty, e-ticket QR, boarding pass, rebook/cancel self-service.
- **Web:** promo codes at checkout, **counter/agent POS** improvements (cash reconciliation, shift close), printable manifests/tickets.
- **OS:** **settlement engine + operator statements**, staff attendance/leave/payroll export (extend the HR module), maintenance & fitness/permit expiry alerts, TimescaleDB for GPS history + trip playback.

### 4.D Wave P2 — differentiation / AI (14–28 weeks)
- **AI (wire the stub):** **dynamic pricing** (demand/seat-fill/route/time — the `ai-service` price-suggestion endpoint already exists), **demand forecasting** for scheduling, **no-show/fraud scoring**, and an **Urdu WhatsApp booking assistant** (huge in PK). Use latest Claude models.
- **Analytics:** wire `analytics-service` — occupancy, RASK/CASK-style yield, route profitability, driver scorecards, live ops map.
- **OS:** ETA/delay prediction from GPS, geofenced arrival SMS, incident/SOS panel.

### 4.E Wave P3 — scale & platform (28 weeks+)
- **Marketplace app (B2B2C):** aggregate on-OS operators into a passenger super-app; compete with Bookme with *better data*.
- **Open API / partner integrations** (aggregators, corporates, travel agents), cargo/parcel module (Pakistan operators run parcels), multi-modal (train/air) later.
- **Raast / bank rails**, wallet float, corporate accounts & invoicing.

---

## PART 5 — Immediate next 5 (highest leverage)
1. **Certify one real payment gateway** end-to-end (unblocks revenue).
2. **Passenger mobile app MVP** (reuse Flutter + API).
3. **SuperAdmin: settlement + refund execution** (turns oversight into a business + closes the refund gap).
4. **Wire real SMS/WhatsApp confirmations** (trust + support-cost reduction).
5. **Promo/coupon engine** (growth lever competitors lean on heavily).

> Guiding principle: **win supply, not demand.** Be the OS bus companies run their business on — then turn that supply into a marketplace the aggregators can't match on data quality.
