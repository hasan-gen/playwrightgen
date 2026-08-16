# Architecture Decisions

## 001 — Evolve the brownfield application

**Decision:** Use strangler-style evolution rather than replacing the existing
application.

**Reason:** Existing generator and intelligence features are working assets.
Project-aware replacements can reuse them while reducing migration risk.

## 002 — Split identity proof from domain authority

**Decision:** Clerk proves user and external organization identity; PostgreSQL
owns domain roles, access, projects, records, archive state, and audit history.

**Reason:** Server-side domain authorization needs durable, queryable,
tenant-scoped state. Email and client-controlled organization identifiers are
not authorization authority.

## 003 — Treat Clerk webhooks as eventually consistent input

**Decision:** Verify signatures before processing, normalize an allowlisted
payload, process serializable transactions, track provider update time and last
event ID, soft-delete, and support scoped reconciliation.

**Reason:** Webhook delivery is retryable and eventually consistent. Duplicate
and out-of-order events must not duplicate Activity or overwrite newer state.

## 004 — Restrict reconciliation scope

**Decision:** Reconciliation requires exactly one organization ID or slug, is
dry-run by default, and writes only with `--apply`.

**Reason:** A bounded repair tool is safer to inspect and operate than an
implicit all-tenant sweep.

## 005 — Use provider IDs as synchronization keys

**Decision:** `clerkUserId`, `clerkOrganizationId`, and `clerkMembershipId`
identify synchronized records. Email is descriptive data only.

**Reason:** Emails change and are not a secure or stable identity boundary.

## 006 — Use Clerk's first-party relay for local webhook proof

**Decision:** Prefer the official Clerk CLI relay for development webhook
testing. Keep the relay URL and endpoint signing secret out of source control.

**Reason:** It avoids publishing the entire local application through a generic
tunnel and limits external-account work to endpoint configuration and test
delivery.

## 007 — Derive domain authority from synchronized server state

**Decision:** `requireWorkspaceContext` starts from Clerk's authenticated user
and active organization, then resolves local User, Organization, Membership,
optional Project, and optional ProjectMembership. Caller IDs and slugs can only
narrow that authenticated context.

**Reason:** This prevents caller-controlled tenant selection, email-based
authorization, and unscoped project lookup while providing consistent
401/403/404 semantics for future APIs and Server Actions.

## 008 — Keep project mutations and Activity atomic

**Decision:** Project state transitions and their Activity records execute in
the same Prisma transaction. Project and ProjectMembership lookups include the
organization boundary; archive and removal update status rather than delete.

**Reason:** Audit history must describe committed state exactly, and composite
tenant scoping prevents guessed or foreign identifiers from crossing tenants.

## 009 — Put the first workspace UI directly over domain services

**Decision:** Server components read through tenant-safe project services and
Server Actions mutate through the same services. Route parameters constrain
the authenticated tenant but never establish authority.

**Reason:** One authorization and transaction boundary keeps the initial UI
thin, prevents browser-provided organization or project IDs from bypassing
domain rules, and avoids duplicating an internal HTTP API before it is needed.

## 010 — Separate current Requirement state from immutable snapshots

**Decision:** `Requirement` is the current workflow record and every material
draft edit creates a new `RequirementVersion` snapshot. Draft updates require
the expected current version. Approved content cannot use the draft-update
path.

**Reason:** Queries remain practical while historical content is preserved for
traceability. Optimistic version checks prevent a stale form from overwriting a
newer draft.

## 011 — Make Requirement workflow transitions conditional and explicit

**Decision:** Draft, review, approval, change-request, and archive operations
are named domain transitions. State changes use conditional updates and write
Activity in the same transaction. Project Leads may draft/submit; Owner/Admin
alone may approve/archive.

**Reason:** Explicit transitions make approval authority auditable and prevent
concurrent requests from recording duplicate effective state changes.
