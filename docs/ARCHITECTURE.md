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

## Test Cases and Requirement traceability

`TestCase` stores current project-scoped test intent while `TestCaseVersion`
stores immutable snapshots of objective, preconditions, structured steps,
expected results, priority, type, tags, source, owner, and automation status.
Draft edits use optimistic version checks. Submission requires an objective,
at least one step, and at least one expected result. Project Leads may author
and submit; Owner/Admin alone may approve or archive.

`RequirementTestCase` is a composite-tenant join. Database foreign keys and
services both require the Requirement and Test Case to belong to the same
organization and project. Link/unlink operations write Activity only when the
effective relationship changes.

Automation status stores no generated code. Browser, API, and integration
automation will be separate engines consuming an approved, immutable
TestCaseVersion so engine changes never rewrite approved test intent.

## Test Runs and immutable execution evidence

`TestRun` pins one approved `TestCaseVersion` using a composite tenant foreign
key and stores the execution mode, environment, browser, base URL, current
aggregate result, and latest attempt number. A run can represent manual,
Playwright Browser, or API execution without changing its pinned test intent.

`TestRunAttempt` is append-only execution evidence. Each attempt snapshots the
run configuration and stores result, duration, per-step outcomes, summary,
failure/blocker details, evidence links, executor, and timestamp. Recording an
attempt conditionally increments the aggregate attempt number in the same
transaction, preventing concurrent attempts from claiming the same sequence.
Retrying appends a new attempt; services expose no edit or delete operation.

Project Members and Leads may create and execute runs, Viewers are read-only,
and cancellation is restricted to Leads and organization Owner/Admin. Every
effective create, attempt, and cancellation writes Activity atomically.

## Evidence-bound AI Failure Intelligence

`FailureAnalysis` references one immutable `TestRunAttempt` and records model,
prompt/schema versions, usage, safe status/failure code, actor, and timing.
`FailureFinding` stores a category, confidence, explanation, recommendation,
and one exact evidence quote with explicit Open, Confirmed, or Dismissed state.

The provider uses the OpenAI Responses API with Zod Structured Outputs and
`store: false`. Attempt data is treated as untrusted content. A deterministic
local evidence map covers run result, summary, failure details, step results,
evidence links, objective, steps, and expected results. Every model citation
must be an exact normalized substring of its selected immutable field before
anything is persisted. Failed/refused/invalid outputs create a safe failed
analysis record and no findings. Human resolution never edits the attempt.

## Versioned Playwright automation artifacts

`AutomationArtifact` is a tenant/project-scoped lifecycle record pinned to one
approved immutable `TestCaseVersion` and one explicit engine: Playwright
Browser or Playwright API. The engines share review controls but remain
separate because their fixtures, validation rules, and execution behavior are
different. One artifact is unique per Test Case version and engine.

`AutomationArtifactVersion` is append-only generated content. It stores a
structured plan, TypeScript Playwright code, configuration, dependencies,
assumptions, model/prompt/schema/token metadata, and deterministic validation
findings. Provider failures append a safe failed version with no executable
content. The artifact tracks the current version and an independently retained
approved version, so regeneration never destroys an earlier approval.

The OpenAI provider uses the Responses API with Zod Structured Outputs and
`store: false`. A local validator blocks Markdown-wrapped code, missing tests
or assertions, focused tests, unsafe execution primitives, sensitive logging,
disallowed Node capabilities, unsupported dependencies, and engine/fixture
mismatches. Hard waits, brittle selectors, and weak assertions are review
warnings. Generated code is never executed in this milestone.

Assigned Members may generate drafts, Project Leads may submit them, and only
organization Owner/Admin may approve or request changes. Every creation,
version generation, and workflow transition writes Activity in the same
transaction as its effective domain change. Approval updates the Test Case's
query-friendly automation summary without modifying its immutable version.

## Repository import and execution boundary

V1.8 uses a least-privilege GitHub App. A verified installation belongs to one
Organization, a repository connection belongs to one project, and every import
is pinned to an exact commit. Initial permissions are metadata read and Contents
read. Short-lived, repository-restricted installation tokens are never stored.
Imported paths, blob identities, parser results, and limitations are
preliminary source evidence; they do not become approved test intent or passing
execution evidence.

The web application is the control plane and never executes repository code.
Remote execution remains disabled until the disposable sandbox, typed job
contract, resource/network controls, artifact manifest, idempotent ingestion,
quotas, retention, and abuse tests in
`docs/GITHUB_AND_RUNNER_ARCHITECTURE.md` are implemented and reviewed.

## GitHub installation synchronization boundary

`POST /api/webhooks/github` reads the exact raw request body, enforces a bounded
payload size, and verifies `X-Hub-Signature-256` with HMAC-SHA256 and a
timing-safe comparison before JSON parsing. The route requires
`X-GitHub-Delivery` and `X-GitHub-Event`, then dispatches only allowlisted
installation lifecycle fields.

`GitHubWebhookDelivery` stores the delivery ID, payload digest, event/action,
optional tenant-bound installation identity, result, and processing time. It
never stores the raw payload. The unique delivery ID makes GitHub redelivery
idempotent; reusing one delivery ID with another digest is rejected.
Suspension and removal immediately block imports through installation status.
Removal also marks connected repositories as access removed. Repository access
events update only matching installation connections, and an ambiguous
all-to-selected transition disables existing connections until live access is
reverified. Lifecycle changes and PII-safe Activity share one serializable
transaction.

## GitHub setup authorization boundary

The GitHub setup start route is available only to an authenticated Organization
Owner/Admin for an exact tenant-scoped project. It generates a signed ten-minute
install state. The post-install handler verifies that state, the current local
actor, and project before starting GitHub user authorization with PKCE. The
OAuth callback uses the transient user token only to verify access to the
returned installation, authenticates independently as the GitHub App, enforces
metadata/contents read-only permissions, and then calls the existing
tenant-scoped installation binding service. No provider token is persisted.

The Repository evidence page lists repositories live through an ephemeral
installation token. A selected repository is checked live again on submission
before its normalized identity is connected to the project. Provider-supplied
form fields are never accepted as repository authority.

## Validation strategy

Vitest unit tests cover normalization, event decisions, safe Activity metadata,
and the route boundary. Integration tests use a physically separate PostgreSQL
test database and cover synchronization, replay, stale events, soft deletion,
Owner bootstrap, transaction rollback, reconciliation, and tenant constraints.
TypeScript, ESLint, and a production Next.js build remain milestone gates.
