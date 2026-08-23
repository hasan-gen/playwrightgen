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

## 012 — Persist AI advice separately from authoritative domain content

**Decision:** Requirement review writes generic `AiRun` and `AiSuggestion`
records tied to one immutable RequirementVersion. Accept/Dismiss changes only
suggestion state. Requirement content changes remain explicit versioned user
actions.

**Reason:** AI remains assistive and auditable. Model output cannot silently
rewrite or approve the authoritative requirement.

## 013 — Require structured output and locally verifiable evidence

**Decision:** The provider uses OpenAI Structured Outputs with a Zod schema,
handles refusals, and validates quoted evidence against the selected immutable
version before persistence. Model, prompt/schema versions, and token usage are
recorded.

**Reason:** Schema adherence alone cannot prove factual grounding. Local
evidence checks and version references make suggestions inspectable and safer.

## 014 — Version test intent independently from workflow state

**Decision:** `TestCase` holds current workflow state and every material draft
edit creates an immutable `TestCaseVersion`. Requirement traceability is a
composite organization/project relationship with database enforcement.

**Reason:** Approved intent, historical edits, and coverage links must remain
auditable without mutable history or application-only tenant checks.

## 015 — Keep automation engines separate from Test Case intent

**Decision:** Playwright browser, API, and future integration engines consume
an approved TestCaseVersion and produce separate reviewable artifacts.
`automationStatus` tracks lifecycle but stores no generated code.

**Reason:** Different engines need different inputs, validation, and artifacts.
Separation supports distinct functionality/versioning without mutating test
intent.

## 016 — Pin Test Runs to immutable approved intent

**Decision:** A Test Run references both a Test Case and one exact immutable
TestCaseVersion. Creation is allowed only while that Test Case is approved.

**Reason:** Later edits or archival must not change what an historical run was
intended to verify, and mismatched versions must be rejected by the database.

## 017 — Append execution attempts instead of editing evidence

**Decision:** Overall Run status is a query-friendly aggregate, while each
manual, Playwright Browser, or API attempt is append-only. A conditional
attempt counter serializes concurrent writes; retries create new evidence.

**Reason:** Failed and passing results are operational evidence. Preserving
every attempt enables trustworthy failure analysis, audit, and trend history.

## 018 — Require evidence-bound, reviewable failure classification

**Decision:** Failure Intelligence analyzes exactly one immutable failed or
blocked attempt through Structured Outputs. Every finding must cite an exact
stored evidence quote; local validation runs before persistence. Findings are
advisory until a Lead or Owner/Admin confirms or dismisses them.

**Reason:** A valid JSON schema cannot prevent invented root causes. Evidence
validation, provider metadata, safe failures, and human resolution make AI
analysis inspectable without corrupting execution history.

## 019 — Version generated automation independently from approved test intent

**Decision:** One engine-specific `AutomationArtifact` pins an approved
`TestCaseVersion`. Every generation appends an immutable artifact version with
structured plan/code/configuration, provider metadata, and local validation.
The current draft and last approved version are tracked independently.

**Reason:** Generated code changes more frequently than approved test intent.
Separate Browser/API engines, deterministic blocking rules, preserved approval
history, and explicit human transitions prevent AI output from silently
becoming trusted or executable automation.

## 020 — Keep interactive authentication on first-party application routes

**Decision:** PlaywrightGen mounts Clerk's supported SignIn and SignUp
components at `/sign-in` and `/sign-up`. Protected workspace requests preserve
their return URL but redirect to the local sign-in route instead of depending
on the hosted Account Portal for the complete interactive flow.

**Reason:** A first-party route keeps the user inside the product, provides a
recoverable branded experience, and avoids making workspace access depend on
browser-specific behavior at a cross-site hosted sign-in page. Clerk still
proves identity; PostgreSQL authorization and organization scoping are
unchanged.
