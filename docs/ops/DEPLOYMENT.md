# TransportOS — Deployment & Production Engineering

Milestone 10 artifacts: CI/CD, containerization, Kubernetes, and observability.

## CI/CD
`.github/workflows/ci.yml` runs on every push to `master`/`feat/**`/`fix/**` and on PRs to `master`:
- **backend**: `npm ci` → typecheck (`tsc` on api-gateway) → `npm run build` → `npm test`
- **frontend**: `npm ci` → `tsc --noEmit` → `next build`

Extend with a `docker` job that builds and pushes images to GHCR on `master`, then a deploy step (`kubectl apply` or Railway CLI).

## Containers
Multi-stage Dockerfiles (Node 20 alpine):
- `backend/Dockerfile` — build → runtime; boots with `migration:run && start:prod`. Keeps devDeps (the ts-node migration runner needs them).
- `frontend/Dockerfile` — takes `NEXT_PUBLIC_API_URL` as a build arg (baked into the bundle).

Build locally:
```bash
docker build -t transportos-backend ./backend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.transportos.pk/api/v1 -t transportos-frontend ./frontend
```

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

## Health & metrics
`/health/live`, `/health/ready`, `/metrics` (see `RUNBOOK.md`). Wire Prometheus to scrape `/metrics` and Grafana for dashboards; alert on `transportos_http_requests_total{status=~"5.."}` rate and readiness failures.
