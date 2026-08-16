# Checkpoint Status

This is the authoritative roadmap ledger. Update it whenever a milestone is
completed, materially changed, or blocked.

| Checkpoint | Status | Evidence |
| --- | --- | --- |
| 1. Dependencies/environment | Complete | Commit `3691461`; dependency and environment baseline established. |
| 2. PostgreSQL/Prisma tenant foundation | Complete | Commit `92da6dc`; tenant schema, migration, and database constraint tests. |
| 3. Clerk workspace/authentication | Complete | Commit `f8916f7`; Clerk-protected `/workspace`, onboarding, organization switching, and workspace shell. |
| 4. Clerk -> PostgreSQL synchronization | Complete | Signed Clerk `user.deleted` delivery reached the local route through Clerk's relay and returned `200`; PostgreSQL stored a soft-deleted record; identical message replay returned `duplicate`. The real development organization, user, and membership were reconciled, followed by a zero-drift dry run. Unit, integration, typecheck, lint, and build validation are recorded in the checkpoint commit. |
| 5. Tenant-safe authorization | Next | Implement server-only `requireWorkspaceContext`, effective roles/permissions, 401/403/404 behavior, and cross-tenant negative tests. |
| 6. Project domain services + Activity | Planned | Tenant-scoped CRUD/archive/restore/member operations with transactional Activity. |
| 7. Real workspace Projects experience | Planned | Real database-backed workspace and project routes with permission-aware controls. |

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

Checkpoint 5 is complete only when server code derives authority from the
authenticated Clerk user and active organization plus synchronized PostgreSQL
Membership; foreign tenant identifiers return 404, inactive membership and
insufficient permission return 403, unauthenticated APIs return 401, and all
tenant/project lookups are scoped and covered by negative tests.
