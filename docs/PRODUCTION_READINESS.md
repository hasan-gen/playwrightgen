# Production Readiness

This checklist is a release gate, not a claim that the current branch is ready
for production.

## Current assessment

**Not production-ready.** Authentication, tenant schema, verified Clerk
synchronization, server authorization, project workflows, and the first
versioned Requirements workflow, advisory AI Requirement Review, versioned Test
Cases with Requirement traceability, immutable Test Runs, versioned Browser/API
automation artifacts, and the source-linked Quality Command Center exist. The
tenant-safe repository import foundation is in progress. Signed GitHub
installation lifecycle, controlled runner isolation, production
billing/operations, and deployment validation remain.

## Gates

| Area | State | Required evidence |
| --- | --- | --- |
| Authentication | Foundation complete | Production Clerk instance/domain, sign-in/out and recovery smoke tests. |
| Clerk synchronization | Development verified | Production endpoint and secret configured separately; production delivery and reconciliation runbook tested. |
| Tenant authorization | Foundation complete | Apply `requireWorkspaceContext` to every Checkpoint 6+ API/Action and retain cross-tenant negative tests as the domain expands. |
| Projects | Foundation UI complete | Add authenticated browser E2E for real data, roles, archive/restore, validation failures, and tenant isolation. |
| Requirements | Workflow + advisory AI review complete | Add authenticated browser E2E, approved-content revision, provider evals, budget/rate limits, and preview evidence. |
| Test Cases | Workflow + automation lifecycle complete | Add authenticated browser E2E, approved-content revision policy, and preview evidence. |
| Automation | Reviewable artifact workflow complete | Add provider eval datasets, isolated execution sandbox, artifact storage/export, CI ingestion, rate/budget limits, authenticated browser E2E, and preview evidence. |
| Repository import | Foundation in progress | Composite tenant schema, immutable source inventory, read-only GitHub client, and Workspace evidence view exist. Add signed installation lifecycle, live selected-repository proof, webhook idempotency, authenticated browser E2E, and Preview evidence. |
| Test Runs | Workflow complete | Add authenticated browser E2E, artifact upload/storage and retention, automated runner ingestion/authentication, and preview evidence. |
| Failure Intelligence | Advisory workflow complete | Add representative eval datasets, prompt/model regression gates, budget/rate limits, monitoring, and authenticated browser E2E. |
| AI workflows | Three project-aware workflows complete | Requirement Review, Failure Intelligence, and Automation Generation use structured outputs, local validation, safe failure state, prompt/schema/model metadata, and token visibility. Add evals, rate/budget controls, monitoring, and later project-aware workflows. |
| Billing | Legacy/incomplete | Organization ownership, Stripe lifecycle webhooks, entitlements, idempotency, and test-mode E2E. |
| Database changes | Development/test current | Eight reviewed migrations are applied to development and test. Before production: backup/PITR validation, `prisma migrate deploy` in preview, smoke test, rollback decision, then production deploy approval. |
| CI and quality | V1.8 import foundation gates pass; CI baseline added | 147 tests, Prisma validation, typecheck, full-project lint, a real Chromium public-surface check, and the production build pass. The least-privilege GitHub Actions workflow repeats these gates with a dedicated PostgreSQL service. Add a passing hosted run, authenticated Preview E2E, dependency review, and branch protection. |
| Observability | Missing | Structured safe errors, monitoring, alerting, webhook failure visibility, and incident ownership. |
| Security/privacy | In progress | Authorization review, upload/URL-fetch controls, secret audit, retention/privacy/legal review. |
| Deployment | Plan recorded | Follow `docs/VERCEL_PREVIEW_PLAN.md`: isolated Preview variables/database/providers, protected commit deployment, migration and smoke-test evidence, rollback decision, then explicit production approval. No Vercel project is linked yet. |

## Environment separation

Development, test, preview/staging, and production must use separate databases
and the appropriate Clerk/Stripe instances and webhook secrets. Never reuse a
development signing secret in production or expose secret values in logs,
screenshots, documentation, or commits.

## Release rule

A successful build is necessary but insufficient. Production release requires
all applicable gates above, a preview deployment with E2E evidence, migration
and rollback readiness, and explicit production approval.
