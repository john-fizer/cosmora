# 17 — Infrastructure and Deployment

## Purpose

Define scalable production infrastructure.

## Environments

- local
- dev
- staging
- production
- research-sandbox

## Core infrastructure

- Kubernetes for service orchestration.
- PostgreSQL primary with read replicas.
- Neo4j cluster or managed graph database.
- Vector store using pgvector initially.
- Object storage for media.
- Event bus using NATS, Kafka, or cloud-native queue.
- Redis for caching and ephemeral workflow state.
- OpenTelemetry for traces, metrics, logs.
- Prometheus/Grafana for dashboards.
- Terraform for infrastructure as code.
- GitHub Actions or equivalent for CI/CD.

## Deployment units

- api-gateway
- auth-service
- event-service
- astrology-service
- graph-projection-service
- vector-memory-service
- agent-orchestrator
- probability-engine
- cinema-engine
- renderer-api
- media-service
- worker-pool

## Kubernetes strategy

Stateless services use Deployments. Stateful systems use managed databases or StatefulSets only when managed services are unavailable.

## Scaling strategy

- API Gateway: horizontal autoscale by CPU and request rate.
- Astrology Service: CPU-bound worker autoscale by job queue depth.
- Agent Orchestrator: autoscale by workflow queue depth and model rate limits.
- Renderer API: autoscale by active scene streams.
- Cinema Engine: async worker pool; GPU workloads separated.

## Secrets

No secrets in repo. Use cloud secret manager. Local dev uses `.env.example` only.

## CI/CD gates

- Type check.
- Unit tests.
- Integration tests.
- Schema migration tests.
- API contract tests.
- Security scan.
- Container scan.
- Load test for critical paths.

## Backup and recovery

- PostgreSQL point-in-time recovery.
- Neo4j projection rebuild from canonical store.
- Vector index rebuild from canonical objects.
- Object storage versioning.
- Daily restore drill in staging.

## Acceptance criteria

- One-command local dev boot.
- Staging environment matches production topology.
- All services expose health endpoints.
- All services emit traces.
- Database migrations are reversible or explicitly marked destructive.
