# Production Readiness

This checklist is a release gate, not a claim that the current branch is ready
for production.

## Current assessment

**Not production-ready.** Authentication, the tenant schema, verified Clerk
synchronization, and the server authorization foundation exist. Real project
workflows, core V1 domain workflows, production operations, and deployment
validation remain.

## Gates

| Area | State | Required evidence |
| --- | --- | --- |
| Authentication | Foundation complete | Production Clerk instance/domain, sign-in/out and recovery smoke tests. |
| Clerk synchronization | Development verified | Production endpoint and secret configured separately; production delivery and reconciliation runbook tested. |
| Tenant authorization | Foundation complete | Apply `requireWorkspaceContext` to every Checkpoint 6+ API/Action and retain cross-tenant negative tests as the domain expands. |
| Projects | Schema only | Checkpoints 6–7 services, APIs/UI, Activity, archive/restore, and E2E. |
| Requirements/Test Cases/Test Runs | Missing | Versioned domain workflows, traceability, execution history, and tests. |
| AI workflows | Legacy only | Project-aware prompts, structured outputs, evidence, safe failure handling, and usage visibility. |
| Billing | Legacy/incomplete | Organization ownership, Stripe lifecycle webhooks, entitlements, idempotency, and test-mode E2E. |
| Database changes | Foundation only | Migration review/deploy plan, backup/PITR validation, restore exercise, and rollback plan. |
| CI and quality | Checkpoints 4–5 gates pass; legacy lint debt | 64 tests, typecheck, changed-file lint, and production build pass locally. Full-project lint still has six pre-existing errors in untouched legacy pages; resolve them before enforcing the full lint gate in CI. Add preview E2E, dependency review, and branch protection. |
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
