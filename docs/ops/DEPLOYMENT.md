# TransportOS — Deployment & Production Engineering

Milestone 10 artifacts: CI/CD, containerization, Kubernetes, and observability.

## CI/CD
`.github/workflows/ci.yml` runs on every push to `master`/`feat/**`/`fix/**` and on PRs to `master`:
- **backend**: `npm ci` → typecheck (`tsc` on api-gateway) → `npm run build` → `npm test`
- **frontend**: `npm ci` → `tsc --noEmit` → `next build`

Extend with a `docker` job that builds and pushes images to GHCR on `master`, then a deploy step (`kubectl apply` or Railway CLI).

## Containers
Multi-stage Dockerfiles (Node 20 alpine) live in `infrastructure/docker/` — deliberately NOT at the service roots, so Railway keeps using Nixpacks (its Metal builder auto-uses a root Dockerfile if present, which changes the build path).
- `backend.Dockerfile` — build → runtime; CMD is `start:prod` only.
- `frontend.Dockerfile` — takes `NEXT_PUBLIC_API_URL` as a build arg (baked into the bundle).

Build locally (context = the service dir, Dockerfile via `-f`):
```bash
docker build -f infrastructure/docker/backend.Dockerfile -t transportos-backend ./backend
docker build -f infrastructure/docker/frontend.Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.transportos.pk/api/v1 -t transportos-frontend ./frontend
```

## Migrations (release step — not in the start command)
Migrations run as their own step, never chained into app start (the ts-node
migration CLI can keep the event loop alive and hang boot). Apply before/at release:
```bash
cd backend && DATABASE_URL=... DATABASE_SSL=true npm run migration:run
```
In k8s, run this as a `Job` (or initContainer) before rolling the Deployment.

## Kubernetes (`infrastructure/k8s/`)
Apply in order (filenames are ordinal):
```bash
kubectl apply -f infrastructure/k8s/
```
- `00-namespace` · `10-config` (ConfigMap + **Secret template — fill real values out-of-band**) · `20-backend` (Deployment + Service + HPA 2→8 on 70% CPU, liveness/readiness probes) · `30-frontend` · `40-ingress` (nginx + cert-manager TLS).

Never commit real secrets. Create `backend-secrets` with `kubectl create secret` (see comment in `10-config.yaml`).

## Environments
| | Railway (now) | Kubernetes (scale-out) |
|---|---|---|
| Deploy | `railway up` per service | `kubectl apply` + GHCR images |
| Scaling | vertical / manual | HPA (CPU-based) |
| TLS | platform-managed | cert-manager + Let's Encrypt |
| Secrets | service env vars | k8s Secret |

## Required env vars (backend)
`DATABASE_URL`, `DATABASE_SSL`, `REDIS_HOST/PORT/PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`, `CORS_ORIGIN`, `PLATFORM_COMMISSION_PCT`, optional `ANTHROPIC_API_KEY` (copilot/agents upgrade to full Claude).

## Health, metrics & tracing
`/health/live`, `/health/ready`, `/metrics` (see `RUNBOOK.md`). Wire Prometheus to scrape `/metrics` and Grafana for dashboards; alert on `transportos_http_requests_total{status=~"5.."}` rate and readiness failures.

**Request tracing**: every request gets an `X-Request-Id` (propagated if the caller sends one, else generated), echoed on the response and included in the structured access log. This is the correlation-id foundation for distributed tracing — to complete it, run an OpenTelemetry collector and have services emit spans keyed on that header.

## Remaining infrastructure (provisioning decisions, not code)
These are deliberately left as decisions for whoever runs production; the app is built to slot into them:
- **Message broker** (RabbitMQ/Kafka): the Event Engine currently persists events to Postgres and processes them in-process. For high throughput, publish `platform_events` to a broker and move rule evaluation to consumers. The `EventBusService.emit()` seam is the single integration point.
- **CDN**: front the frontend + `/uploads` static assets with a CDN (Cloudflare/CloudFront). No code change needed.
- **Multi-region**: run the k8s manifests in a second region behind a global load balancer; use a read-replica or managed multi-region Postgres. Migrations remain a single release-phase step.
- **DR drills**: schedule quarterly restore tests of the managed Postgres backups; document RPO/RTO once the business sets targets. `RUNBOOK.md` has the rollback/restore steps.
- **Distributed tracing collector**: deploy an OTel collector + Jaeger/Tempo; instrument spans off `X-Request-Id`.
