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
and secure setup flow are implemented and proven on an isolated Preview with a
real exact-ref public import. The organization-scoped Stripe persistence and
entitlement foundation passed a fresh hosted PostgreSQL migration and the full
CI job, but has not passed the isolated Preview database migration or Stripe
test-mode lifecycle E2E. Authenticated Preview automation,
controlled runner isolation, production billing operations, and deployment
validation remain.

## Gates

| Area | State | Required evidence |
| --- | --- | --- |
| Authentication | Foundation complete | Production Clerk instance/domain, sign-in/out and recovery smoke tests. |
| Clerk synchronization | Development verified | Production endpoint and secret configured separately; production delivery and reconciliation runbook tested. |
| Tenant authorization | Foundation complete | Apply `requireWorkspaceContext` to every Checkpoint 6+ API/Action and retain cross-tenant negative tests as the domain expands. |
| Projects | Foundation UI + manual Preview create proof | Authenticated Owner project creation succeeded against the isolated Preview database. Add automated browser E2E for roles, archive/restore, validation failures, and tenant isolation. |
| Requirements | Workflow + advisory AI review complete | Add authenticated browser E2E, approved-content revision, provider evals, budget/rate limits, and preview evidence. |
| Test Cases | Workflow + automation lifecycle complete | Add authenticated browser E2E, approved-content revision policy, and preview evidence. |
| Automation | Reviewable artifact workflow complete | Add provider eval datasets, isolated execution sandbox, artifact storage/export, CI ingestion, rate/budget limits, authenticated browser E2E, and preview evidence. |
| Repository import | Live read-only Preview proof complete | Composite tenant schema, immutable source inventory, signed setup state, PKCE GitHub user verification, strict App verification, live repository revalidation, signed/idempotent webhook handling, and fail-closed revocation exist. Preview bound installation `157602553`, connected public `hasan-gen/playwrightgen` across the owner boundary, and pinned immutable snapshots. `main@e65879da` correctly reported incomplete evidence because that branch lacked a Playwright config/specs; `hasan_genai@58814e3a` succeeded with one config, 24 spec files, 190 test declarations, and three support files. Add automated authenticated browser E2E, configure an isolated Preview webhook, and recover/transfer repository ownership before private-repository, branch-protection, or PR-reporting claims. |
| Test Runs | Workflow complete | Add authenticated browser E2E, artifact upload/storage and retention, automated runner ingestion/authentication, and preview evidence. |
| Failure Intelligence | Advisory workflow complete | Add representative eval datasets, prompt/model regression gates, budget/rate limits, monitoring, and authenticated browser E2E. |
| AI workflows | Safety foundation implemented; Preview proof pending | Requirement Review, Failure Intelligence, and Automation Generation use structured outputs, local validation, safe failure state, prompt/schema/model metadata, token visibility, finite output-token ceilings, and a shared atomic Organization budget. Public AI routes have atomic pre-provider burst/daily controls and HMAC client keys. Add eval datasets, plan-specific entitlement limits, hosted CI and protected Preview evidence, and token/cost baselines. |
| Billing | Organization foundation hosted-CI validated; checkout locked | Commit `92c68bf` and CI run `33447222445` prove the additive migration and billing lifecycle tests against fresh PostgreSQL. Apply the migration to isolated Preview with snapshot/rollback evidence, then configure a Preview-only Stripe test-mode endpoint, prove signed checkout/subscription create-update-cancel replay and stale-event behavior, add reconciliation and operational alerts, verify the customer portal and support/refund terms, and keep `STRIPE_CHECKOUT_ENABLED` absent until explicit launch approval. |
| Database changes | Development/test/Preview current | Nine reviewed migrations are applied to development and test. The isolated Neon Preview branch was created schema-only; an exact migrations-to-database diff reported no drift before all nine migrations were baselined, and `prisma migrate status` reported current. Before production: validate backup/PITR and the rollback runbook against a disposable branch, run the authenticated Preview data-flow suite, then obtain production deploy approval. |
| CI and quality | V1.8 secure setup gates pass; hosted CI green | 175 tests, Prisma validation, typecheck, full-project lint, a real Chromium public-surface check, and the production build pass. GitHub Actions run `33317894326` passed with its dedicated PostgreSQL service. Add authenticated Preview E2E, dependency review, and branch protection. |
| Observability | Safe AI telemetry foundation implemented | Public AI operations emit allowlisted JSON with request IDs, outcome, latency, and token usage. Configure Vercel log ingestion and alerts, add webhook/database visibility, define incident ownership, and prove alert delivery on Preview. |
| Security/privacy | In progress | Public AI client keys no longer contain raw IPs; active routes enforce request bounds and atomic limits; unused legacy AI routes are quarantined by default, preventing the legacy server-side URL fetch from executing. Complete authorization review, secret audit, retention/privacy/legal review, and verify `ENABLE_LEGACY_AI_ROUTES` is absent from Preview/Production. |
| Deployment | Isolated authenticated Preview works | Vercel project `hasan-gens-projects/playwrightgen` is linked to `hasan-gen/playwrightgen`; Vercel protection guards unauthenticated requests, while the user completed authenticated sign-in, Owner project creation, and an exact-ref GitHub import against the isolated Preview database. Commit `92c68bf` built as Ready Preview `dpl_Hxb1NgtN4aWvPaDNwZEXJCFncyK5`, and hosted CI run `33447222445` passed. The billing migration is not yet applied to the isolated Preview database, so that deployment is build evidence rather than billing data-flow evidence. Add isolated webhooks, authenticated E2E, migration/rollback evidence, then request explicit production approval. |

## Environment separation

Development, test, preview/staging, and production must use separate databases
and the appropriate Clerk/Stripe instances and webhook secrets. Never reuse a
development signing secret in production or expose secret values in logs,
screenshots, documentation, or commits.

## Release rule

A successful build is necessary but insufficient. Production release requires
all applicable gates above, a preview deployment with E2E evidence, migration
and rollback readiness, and explicit production approval.
