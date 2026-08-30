# Production Readiness

This checklist is a release gate, not a claim that the current branch is ready
for production.

## Current assessment

**Not production-ready.** Authentication, tenant schema, verified Clerk
synchronization, server authorization, project workflows, and the first
versioned Requirements workflow, advisory AI Requirement Review, versioned Test
Cases with Requirement traceability, immutable Test Runs, versioned Browser/API
automation artifacts, and the source-linked Quality Command Center exist. The
tenant-safe repository import foundation, signed GitHub installation lifecycle,
and secure setup flow are implemented. Live provider proof, controlled runner
isolation, production billing/operations, and deployment validation remain.

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
| Repository import | Secure setup foundation implemented | Composite tenant schema, immutable source inventory, read-only GitHub client, Workspace evidence view, raw-body HMAC verification, delivery idempotency, fail-closed access revocation, signed expiring setup state, PKCE, GitHub user-installation verification, and live repository revalidation exist. The repository owner is the separate GitHub user `hasan-gen`, while the development App was created through browser user `hmamut39`; recover owner access or deliberately transfer the repository before private-repository, branch-protection, or PR-reporting claims. Add one live exact-commit import proof, authenticated browser E2E, and full Preview evidence. |
| Test Runs | Workflow complete | Add authenticated browser E2E, artifact upload/storage and retention, automated runner ingestion/authentication, and preview evidence. |
| Failure Intelligence | Advisory workflow complete | Add representative eval datasets, prompt/model regression gates, budget/rate limits, monitoring, and authenticated browser E2E. |
| AI workflows | Three project-aware workflows complete | Requirement Review, Failure Intelligence, and Automation Generation use structured outputs, local validation, safe failure state, prompt/schema/model metadata, and token visibility. Add evals, rate/budget controls, monitoring, and later project-aware workflows. |
| Billing | Legacy/incomplete | Organization ownership, Stripe lifecycle webhooks, entitlements, idempotency, and test-mode E2E. |
| Database changes | Development/test current | Nine reviewed migrations are applied to development and test. Before production: backup/PITR validation, `prisma migrate deploy` in preview, smoke test, rollback decision, then production deploy approval. |
| CI and quality | V1.8 secure setup gates pass; hosted CI green | 175 tests, Prisma validation, typecheck, full-project lint, a real Chromium public-surface check, and the production build pass. GitHub Actions run `33317894326` passed with its dedicated PostgreSQL service. Add authenticated Preview E2E, dependency review, and branch protection. |
| Observability | Missing | Structured safe errors, monitoring, alerting, webhook failure visibility, and incident ownership. |
| Security/privacy | In progress | Authorization review, upload/URL-fetch controls, secret audit, retention/privacy/legal review. |
| Deployment | Protected Preview builds successfully | Vercel project `hasan-gens-projects/playwrightgen` is linked to `hasan-gen/playwrightgen`; final Preview deployment `dpl_7QYEpo2vfDsgzBro68WyXHaXWEzu` reached Ready. Authenticated checks returned `200` for `/` and `/sign-in`, while unauthenticated `/workspace` returned `307` to sign-in. Preview now has a non-production Clerk key pair and a Preview-only app URL. Provision a dedicated Preview Neon branch, complete Preview-only GitHub/webhook variables and callback URLs, run migrations and authenticated smoke tests, record rollback evidence, then request explicit production approval. |

## Environment separation

Development, test, preview/staging, and production must use separate databases
and the appropriate Clerk/Stripe instances and webhook secrets. Never reuse a
development signing secret in production or expose secret values in logs,
screenshots, documentation, or commits.

## Release rule

A successful build is necessary but insufficient. Production release requires
all applicable gates above, a preview deployment with E2E evidence, migration
and rollback readiness, and explicit production approval.
