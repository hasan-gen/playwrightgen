# Checkpoint Status

This is the authoritative roadmap ledger. Update it whenever a milestone is
completed, materially changed, or blocked.

| Checkpoint | Status | Evidence |
| --- | --- | --- |
| 1. Dependencies/environment | Complete | Commit `3691461`; dependency and environment baseline established. |
| 2. PostgreSQL/Prisma tenant foundation | Complete | Commit `92da6dc`; tenant schema, migration, and database constraint tests. |
| 3. Clerk workspace/authentication | Complete | Commit `f8916f7`; Clerk-protected `/workspace`, onboarding, organization switching, and workspace shell. |
| 4. Clerk -> PostgreSQL synchronization | Complete | Signed Clerk `user.deleted` delivery reached the local route through Clerk's relay and returned `200`; PostgreSQL stored a soft-deleted record; identical message replay returned `duplicate`. The real development organization, user, and membership were reconciled, followed by a zero-drift dry run. Unit, integration, typecheck, lint, and build validation are recorded in the checkpoint commit. |
| 5. Tenant-safe authorization | Complete | Server-only `requireWorkspaceContext` resolves Clerk identity through synchronized User/Organization/Membership, scopes projects by organization, enforces roles/permissions and archived-resource allowances, and passes cross-tenant 401/403/404 integration tests. |
| 6. Project domain services + Activity | Complete | Tenant-scoped project list/create/read/update/archive/restore and member assignment/removal/role change services; active-member checks and mutation Activity share transactions; role and cross-tenant integration tests pass. |
| 7. Real workspace Projects experience | Complete | `/workspace/[orgSlug]`, project creation, and project overview render synchronized PostgreSQL state through tenant-safe project services; archive/restore controls are permission-aware; 78 tests, typecheck, changed-file lint, and production build pass. |
| V1.1 Requirements + immutable versions | Complete | Tenant/project-scoped Requirement and RequirementVersion schema, migration, draft/review/approve/archive services, optimistic concurrency, transactional Activity, permission-aware real UI, and development/test migration evidence. |
| V1.2 AI Requirement Review | Complete | Structured OpenAI output, exact-version evidence validation, persistent model/prompt/schema/usage metadata, safe failure records, reviewable suggestions, non-mutating accept/dismiss actions, tenant/role tests, and real Requirement UI. |
| V1.3 Test Cases + traceability | Complete | Tenant/project-scoped TestCase and immutable TestCaseVersion schema; review workflow; optimistic concurrency; composite RequirementTestCase traceability; transactional Activity; real UI; 102 tests and development/test migration evidence. |
| V1.4 Test Runs + execution evidence | Complete | Runs pin an approved immutable TestCaseVersion; append-only attempts capture result, mode, environment, browser, duration, per-step outcomes, failure details, and evidence links; aggregate concurrency, roles, Activity, tenant constraints, real UI, 110 tests, and development/test migrations pass. |
| V1.5 Failure Intelligence | Complete | OpenAI Responses API Structured Outputs classify failed/blocked immutable attempts; local exact-quote evidence validation, model/prompt/schema/token metadata, safe failure records, human confirm/dismiss, tenant/role enforcement, real Test Run UI, 118 tests, and development/test migrations pass. |
| V1.6 Automation artifacts + engines | Complete | Separate Playwright Browser/API engines create append-only artifacts pinned to approved immutable Test Case versions; OpenAI Responses Structured Outputs, deterministic safety/quality validation, safe failed generations, preserved approved revisions, human review/approval, tenant/role enforcement, real Automation Studio UI, 128 tests, and development/test migrations pass. |
| V1.7 Project quality intelligence | Next | Evidence-derived coverage, regression, change-impact, and delivery-confidence views over real Requirements, Test Cases, Automation artifacts, and Test Runs. |

## Checkpoint 4 delivered behavior

- Verifies Clerk webhook signatures before parsing provider data.
- Synchronizes users, organizations, and organization memberships by Clerk ID.
- Soft-deletes users, archives organizations, and removes memberships.
- Rejects stale state changes and treats repeated event IDs as duplicates.
- Bootstraps Owner only from verified organization creator evidence.
- Writes append-only, PII-safe Activity for effective organization/membership
  changes without raw provider payloads.
- Provides a safe, scoped, dry-run-first reconciliation command.

## Next acceptance target

Build project-aware quality intelligence from versioned Requirements, Test
Cases, approved Automation artifacts, and immutable Test Run evidence. Every
coverage or delivery claim must expose its source records and uncertainty.
