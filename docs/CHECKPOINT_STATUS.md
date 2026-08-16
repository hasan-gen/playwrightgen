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

The foundation roadmap is complete. The next vertical slice is V1 Requirements:
tenant-scoped requirements with immutable versions, a draft/review/approve
workflow, transactional Activity, permission enforcement, and real workspace
UI backed only by PostgreSQL state.
