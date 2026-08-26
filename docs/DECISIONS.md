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

## 021 — Keep public AI output preliminary and import only reviewed draft intent

**Decision:** Quick Generate and Coverage Review use the OpenAI Responses API
with Structured Outputs and local deterministic checks. Public results display
their evidence limits and never claim execution, measured coverage, approval,
or release readiness. Continue in Workspace stores a short-lived browser-tab
handoff, requires authentication and project selection, validates the payload
again on the server, and creates only an `AI_SUGGESTED` Requirement or Test Case
draft through tenant-scoped domain services. Generated code is not imported as
trusted automation.

**Reason:** A free prompt result has no durable project authority or approved
test intent. Converting it directly into approved automation would bypass
versioning, RBAC, review, and evidence requirements. A reviewed draft preserves
useful momentum while keeping PostgreSQL and the existing approval workflows
authoritative.

## 022 — Derive project quality intelligence from source-linked records

**Decision:** The project Quality Command Center computes its signals only from
tenant-scoped PostgreSQL records: approved Requirements, approved Test Cases and
their traceability links, approved Automation artifacts pinned to immutable Test
Case versions, immutable Test Run attempts, and reviewed Failure findings. It
shows numerator-and-denominator counts, explicit missing evidence, deterministic
freshness bands, and source links. It does not collapse those records into an AI
readiness or release-confidence score.

**Reason:** A scalar score would hide whether confidence comes from approved
intent, current automation, execution evidence, or assumptions. Source-linked
counts let a project lead inspect and act on the exact gap while preserving
uncertainty. The service first resolves project access through
`requireWorkspaceContext`, then scopes every query by both `organizationId` and
`projectId`; cross-tenant and Viewer-read behavior are covered by integration
tests.

## 023 — Use a least-privilege GitHub App and immutable repository imports

**Decision:** PlaywrightGen will integrate through a GitHub App rather than a
user-owned personal access token. The initial app requests only repository
metadata and read-only Contents access, and subscribes only to installation and
installation-repository lifecycle events. Each verified GitHub installation is
bound to exactly one PlaywrightGen Organization. Each selected repository is
then connected to an explicit project through composite organization/project
keys. Installation access tokens are minted server-side for one installation,
restricted to the selected repository and `contents:read`, allowed to expire,
and never stored in PostgreSQL, browser state, Activity, logs, or AI prompts.

Repository imports are immutable snapshots identified by repository, commit
SHA, and parser version. They preserve source ref, file paths, blob SHAs,
timestamps, and derived inventory only; the first slice does not persist source
file bodies. Imported configuration and tests are preliminary evidence. They
do not create approved Test Cases, approved Automation, passing Test Runs, or
release-readiness claims. GitHub Checks write access, pull-request events,
workflow modification, and repository writes are deferred until their separate
CI-reporting milestone is reviewed.

**Reason:** A GitHub App supports repository selection, narrow permissions,
short-lived installation credentials, and auditable installation lifecycle.
Separating Organization installation ownership from project repository use,
and enforcing both at the database boundary, prevents guessed identifiers or a
shared installation from crossing tenants. Immutable, source-linked imports
make later parsing improvements reviewable without treating repository content
as trusted execution input.

## 024 — Keep repository discovery separate from isolated execution

**Decision:** The Next.js application may authenticate, inventory repository
trees, parse bounded text files, and enqueue execution requests, but it must
never install dependencies or execute repository commands. A future runner
accepts one immutable repository import and an allowlisted Playwright command,
runs in an ephemeral sandbox with explicit CPU, memory, wall-clock, process,
filesystem, output, and network limits, exposes no application or GitHub App
credentials, uploads content-addressed artifacts through single-job scoped
credentials, and is destroyed after completion. Result ingestion is
idempotent and binds every artifact to the Organization, project, repository
import, execution job, and attempt.

**Reason:** Repository contents, package lifecycle scripts, test code, browser
targets, and downloaded dependencies are untrusted. A container alone does not
establish the required boundary. Separating the control plane from disposable
workers prevents a malicious test suite from reaching tenant data or durable
credentials and makes cancellation, quotas, evidence retention, and incident
response enforceable.

## 025 — Preserve Debug and Figma capabilities but align them to quality evidence

**Decision:** The legacy Debug and Figma implementation remains available in
source and will return to the product surface through clearer QA jobs. Quick
Debug may provide explicitly preliminary help for pasted failures, while the
authoritative diagnosis remains attached to an immutable failed Test Run with
logs, steps, and artifacts. Figma/screenshot input will become Visual Testing:
derive reviewable scenarios, visual assertions, accessibility expectations,
and versioned baseline evidence. Generic UI-code generation remains a
secondary legacy utility rather than PlaywrightGen's main promise.

**Reason:** Both capabilities are useful acquisition and workflow inputs, but
top-level generic tools can fragment the product. Connecting them to durable
test intent and evidence preserves user value while strengthening the product's
identity as an AI quality platform.

## 026 — Treat GitHub webhooks as signed, idempotent access revocation input

**Decision:** Verify the exact raw body with the separately stored GitHub
webhook secret and `X-Hub-Signature-256` before parsing. Record each
`X-GitHub-Delivery` once with a SHA-256 payload digest and normalized event
metadata, never the raw payload. Process only installation and
installation-repository lifecycle actions. Suspension or removal blocks new
imports immediately; removal and explicit repository removal transition
connections to access-removed state without deleting historical imports. An
ambiguous all-to-selected transition fails closed until repository access is
reverified.

**Reason:** GitHub deliveries can be replayed, redelivered, delayed, or arrive
after repository access changes. Signature verification proves integrity,
delivery identity prevents duplicate side effects, digest comparison detects
conflicting replay, and conservative revocation prevents stale access from
being treated as current authorization evidence.

## 027 — Verify the installing GitHub user before binding tenant authority

**Decision:** A GitHub setup redirect never trusts the installation ID by
itself. The initiating PlaywrightGen Owner/Admin and exact organization/project
are bound into a signed ten-minute state. After installation, a second signed
state and PKCE-protected GitHub user authorization prove that the current
GitHub user can access the installation. PlaywrightGen then authenticates as
the App, requires an active installation with metadata/contents read only, and
only then binds it to PostgreSQL. User and installation tokens are transient.

**Reason:** GitHub documents that setup URLs can be called with spoofed
installation IDs. App authentication proves that an installation belongs to
the App but does not prove that the current user controls it. Combining local
authorization, signed state, PKCE, user-installation access, and App
verification closes both boundaries without making GitHub identity a
PlaywrightGen authorization authority.
