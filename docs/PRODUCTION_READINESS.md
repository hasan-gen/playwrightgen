# Production Readiness

This checklist is a release gate, not a claim that the current branch is ready
for production.

## Current assessment

**Not production-ready.** Authentication, tenant schema, verified Clerk
synchronization, server authorization, project workflows, and the first
versioned Requirements workflow, advisory AI Requirement Review, and versioned
Test Cases with Requirement traceability exist. Test Runs, production
billing/operations, and deployment validation remain.

## Gates

| Area | State | Required evidence |
| --- | --- | --- |
| Authentication | Foundation complete | Production Clerk instance/domain, sign-in/out and recovery smoke tests. |
| Clerk synchronization | Development verified | Production endpoint and secret configured separately; production delivery and reconciliation runbook tested. |
| Tenant authorization | Foundation complete | Apply `requireWorkspaceContext` to every Checkpoint 6+ API/Action and retain cross-tenant negative tests as the domain expands. |
| Projects | Foundation UI complete | Add authenticated browser E2E for real data, roles, archive/restore, validation failures, and tenant isolation. |
| Requirements | Workflow + advisory AI review complete | Add authenticated browser E2E, approved-content revision, provider evals, budget/rate limits, and preview evidence. |
| Test Cases | Workflow complete | Add authenticated browser E2E, approved-content revision policy, automation artifact lifecycle, and preview evidence. |
| Test Runs | Missing | Immutable version-bound execution attempts, evidence/history, environment metadata, role tests, and browser E2E. |
| AI workflows | First project-aware workflow complete | Requirement Review has structured output, evidence validation, safe failure state, prompt/schema/model metadata, and token visibility. Add evals, rate/budget controls, monitoring, and later project-aware workflows. |
| Billing | Legacy/incomplete | Organization ownership, Stripe lifecycle webhooks, entitlements, idempotency, and test-mode E2E. |
| Database changes | Development/test current | Four reviewed migrations are applied to development and test. Before production: backup/PITR validation, `prisma migrate deploy` in preview, smoke test, rollback decision, then production deploy approval. |
| CI and quality | Foundation + V1.3 gates pass; legacy lint debt | 102 tests, typecheck, changed-file lint, and production build pass locally. Full-project lint still has six pre-existing errors in untouched legacy pages; resolve them before enforcing the full lint gate in CI. Add preview E2E, dependency review, and branch protection. |
| Observability | Missing | Structured safe errors, monitoring, alerting, webhook failure visibility, and incident ownership. |
| Security/privacy | In progress | Authorization review, upload/URL-fetch controls, secret audit, retention/privacy/legal review. |
| Deployment | Missing | Preview/staging, environment validation, smoke tests, production approval, and rollback procedure. |

## Environment separation

Development, test, preview/staging, and production must use separate databases
and the appropriate Clerk/Stripe instances and webhook secrets. Never reuse a
development signing secret in production or expose secret values in logs,
screenshots, documentation, or commits.

## Release rule

A successful build is necessary but insufficient. Production release requires
all applicable gates above, a preview deployment with E2E evidence, migration
and rollback readiness, and explicit production approval.
