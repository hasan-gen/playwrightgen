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

## Server authorization boundary

`requireWorkspaceContext` derives authority from Clerk's authenticated user and
active organization, then resolves the synchronized local User, Organization,
and active Membership. Optional organization IDs and slugs are constraints,
never tenant selectors. Optional project lookup uses the composite
`organizationId + projectId` key. Owner/Admin receive organization-wide project
access; other roles require active ProjectMembership. Archived resources are
hidden unless the caller explicitly allows them.

The boundary returns sanitized 401/403/404 errors and exposes a typed permission
check for organization and project operations. New tenant domain APIs and
Server Actions must use this boundary.

## Project domain services

`lib/services/projects.ts` implements project list/create/read/update/archive/
restore and project member assignment/removal/role changes. Every Project query
contains `organizationId`; regular members list only active assignments.
Effective mutations and append-only Activity are written in one Prisma
transaction. Archive/removal are state transitions. Target project members are
validated as active organization members inside the assignment transaction.

Owner/Admin have organization-wide project authority. An assigned Project Lead
may update its project, while project archive and membership administration
remain Owner/Admin operations.

## Workspace presentation layer

`/workspace` preserves Clerk onboarding when no organization is active and
otherwise redirects to the synchronized local organization slug. The
`/workspace/[orgSlug]` project list, project creation route, and project
overview route call the project services from server components and Server
Actions. They render real PostgreSQL names, descriptions, roles, statuses, and
timestamps. Archive/restore controls are emitted only when the authorization
context grants that permission; mutations are re-authorized by the service.

## Requirements domain

`Requirement` stores the current project-scoped working state while
`RequirementVersion` stores append-only content snapshots. Every snapshot
includes title, description, acceptance criteria, source, external reference,
owner, author, and a monotonically increasing version number. Composite
organization/project/requirement foreign keys prevent cross-tenant history.

Draft edits use an expected version number and create a new snapshot in the
same transaction as the Requirement update and Activity. Workflow transitions
are explicit: Draft -> In Review -> Approved, with an approver-controlled path
back to Draft and a non-destructive Archived state. Project Leads may draft and
submit; only organization Owner/Admin may approve or archive. Conditional
status updates ensure racing transitions produce one winner and one Activity.

The project Requirements routes list real records, create drafts, edit drafts,
show immutable history, and expose submit/review/archive actions according to
server-derived permissions. Approved content is read-only in this slice.

## Advisory AI Requirement Review

`AiRun` records the immutable RequirementVersion, model, prompt/schema
versions, status, safe failure code, token usage, actor, and timing.
`AiSuggestion` stores structured evidence-linked findings with explicit Open,
Accepted, or Dismissed state. Composite foreign keys bind both records to one
organization, project, requirement, and version.

The OpenAI provider uses Zod-backed Structured Outputs and handles refusals
explicitly. A second local validator requires each non-empty evidence quote to
exist in the named RequirementVersion field before persistence. Provider calls
occur only after authorization. Success persists the run, suggestions, and
Activity transactionally; failure stores a safe failed-run record. Accepting a
suggestion acknowledges it and writes Activity but never changes Requirement
content or approval state.

## Validation strategy

Vitest unit tests cover normalization, event decisions, safe Activity metadata,
and the route boundary. Integration tests use a physically separate PostgreSQL
test database and cover synchronization, replay, stale events, soft deletion,
Owner bootstrap, transaction rollback, reconciliation, and tenant constraints.
TypeScript, ESLint, and a production Next.js build remain milestone gates.
