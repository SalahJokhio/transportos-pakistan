# TransportOS — Operations Runbook

Practical, on-call reference. Two deployment targets are supported: **Railway**
(current production) and **Kubernetes** (`infrastructure/k8s/`, for scale-out).

## Services

| Service | Port | Health | Notes |
|---|---|---|---|
| backend (api-gateway) | 3000 | `/health/live`, `/health/ready`, `/api/v1/health` | NestJS modular monolith; runs migrations on boot |
| frontend | 4000 | `/` | Next.js 14; `NEXT_PUBLIC_API_URL` baked at build |
| Postgres | 5432 | `/health/ready` checks it | migrations are the schema source of truth |
| Redis | 6379 | — | seat locks; app degrades gracefully if down |

## Observability

- **Metrics**: `GET /metrics` (Prometheus text). Series: `transportos_http_requests_total`, `transportos_http_request_duration_ms_avg`, `transportos_uptime_seconds`, `transportos_process_resident_memory_bytes`.
- **Probes**: `/health/live` (liveness), `/health/ready` (readiness — verifies DB).
- In k8s, pods are annotated `prometheus.io/scrape` on `/metrics:3000`.

## Common incidents

### Backend returns 5xx after a deploy
1. `GET /health/ready` — if `database: down`, the DB is unreachable or a migration failed on boot.
2. Check logs: `railway logs --service backend` (or `kubectl -n transportos logs deploy/backend`).
3. A failed migration blocks boot (start cmd is `migration:run && start:prod`). Fix or revert the migration (`npm run migration:revert` against the DB), redeploy.

### "column does not exist" errors
Schema drift — an entity references a column no migration created. `synchronize` is OFF in prod by design. Write a migration; never enable `DATABASE_SYNCHRONIZE` in prod.

### Double-booking / seat contention
Two-layer defense: Redis `SET NX` lock + Postgres partial unique index `uq_confirmed_seat`. If Redis is down, the DB index still prevents corruption; only UX degrades.

### Copilot answers look templated (not conversational)
`ANTHROPIC_API_KEY` is unset → grounded keyword fallback (`poweredBy: rules`). Set the key to enable full Claude phrasing; no redeploy of code needed.

## Deploys
- **Railway**: from each service's own dir, `railway up --service <name> --detach` (uploads cwd — never deploy one service from the other's dir).
- **k8s**: `kubectl apply -f infrastructure/k8s/`. Images built by CI and pushed to GHCR.
- Migrations run automatically at container start.

## Rollback
- Railway: redeploy the previous image/commit from the dashboard.
- k8s: `kubectl -n transportos rollout undo deploy/backend`.
- DB: `npm run migration:revert` reverts the latest migration only — check `down()` is safe first.

## Backups / DR
- Managed Postgres provides automated backups; verify restore quarterly.
- RPO/RTO to be set with the business; document restore steps here once the target is chosen.
