# Architecture

## Current system

PlaywrightGen is a Next.js 16 App Router application using React 19 and
TypeScript. The existing product routes call OpenAI and supporting services
from Next.js route handlers. The new workspace foundation uses Clerk for
authentication and PostgreSQL through Prisma 7 with the PostgreSQL adapter.

```text
Browser
  -> Next.js App Router
     -> Clerk (session and external organization identity)
     -> PostgreSQL/Neon (domain and access state)
     -> OpenAI and existing supporting services
```

`proxy.ts` protects `/workspace` and its descendants. The Clerk webhook route
is intentionally outside that authenticated matcher because provider webhook
requests have no user session; it is protected by cryptographic signature
verification instead.

## Data ownership

Clerk proves the external identities of users, organizations, and organization
memberships. PostgreSQL stores synchronized identity references plus all domain
roles, project access, projects, future requirements/tests/runs, and Activity.
Provider IDs—not email addresses—are synchronization identities.

The initial schema contains `User`, `Organization`, `Membership`, `Project`,
`ProjectMembership`, and append-only `Activity`. Composite foreign keys ensure
that a ProjectMembership and project-scoped Activity cannot cross organization
boundaries. Referenced parent deletion is restricted.

## Clerk synchronization boundary

`POST /api/webhooks/clerk` performs four stages:

1. Validate that the endpoint signing secret exists.
2. Verify the raw request cryptographically with Clerk's webhook helper.
3. Normalize and validate only the supported payload fields.
4. Apply one serializable PostgreSQL transaction.

Supported events are the create/update/delete variants for `user`,
`organization`, and `organizationMembership`. The service uses provider IDs,
records the last event and provider update time, rejects stale overwrites,
handles repeated event IDs as duplicates, and soft-deletes or removes access.
Organization and membership changes create PII-safe Activity metadata without
storing raw provider payloads.

`scripts/reconcile-clerk.ts` is a backend-only, single-organization repair
path. It is dry-run by default and requires either a Clerk organization ID or
slug. `--apply` is explicit; there is no unscoped sweep mode.

## Known boundary before Checkpoint 5

Authentication exists, but application authorization is not yet implemented.
The workspace currently trusts Clerk's active organization to render its shell
and does not yet resolve the synchronized local Membership. Checkpoint 5 must
introduce a server-only `requireWorkspaceContext` boundary before tenant domain
APIs or real Projects UI are added.

## Validation strategy

Vitest unit tests cover normalization, event decisions, safe Activity metadata,
and the route boundary. Integration tests use a physically separate PostgreSQL
test database and cover synchronization, replay, stale events, soft deletion,
Owner bootstrap, transaction rollback, reconciliation, and tenant constraints.
TypeScript, ESLint, and a production Next.js build remain milestone gates.
