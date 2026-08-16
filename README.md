# PlaywrightGen

AI-powered Playwright test generation platform for developers, automation engineers, and SDETs.

PlaywrightGen helps teams generate production-ready Playwright tests from prompts, components, HTML snippets, API descriptions, and page URLs.

## Features

- Prompt → Playwright test generation
- Component → Playwright test generation
- Component → unit test generation
- HTML / JSX → Playwright test generation
- API test generation
- URL analysis for more realistic browser flows
- Multiple output styles: Fast, Clean, Production
- Free / Pro product structure
- Copy code and download output
- Built with Next.js + OpenAI

## Example Use Cases

**Developers**
- Generate tests faster while building modern web applications

**Automation Engineers**
- Turn manual test ideas into automated Playwright coverage faster

**SDETs**
- Create stable locators, reusable flows, and production-ready test suites

## Tech Stack

- Next.js
- TypeScript
- OpenAI API
- TailwindCSS
- Playwright
- Cheerio

## Getting Started

Install dependencies:

```bash
npm install
```

## Phase 1A workspace foundation

Checkpoint 2 adds the PostgreSQL schema and initial Prisma migration for the tenant-safe workspace. Checkpoint 4 synchronizes Clerk users, organizations, and organization memberships into those existing PostgreSQL models. Checkpoint 5 adds the server-only tenant authorization boundary, Checkpoint 6 adds tenant-scoped project and project-membership services with transactional Activity, and Checkpoint 7 adds the real database-backed workspace project list, creation, and overview experience.

The first V1 slice adds project-scoped Requirements, immutable
RequirementVersion snapshots, explicit draft/review/approve/archive workflow,
and real permission-aware Requirements routes inside each project.

AI Requirement Review stores advisory, evidence-linked suggestions against one
immutable version. Suggestions can be accepted or dismissed but never mutate
Requirement content. `OPENAI_REQUIREMENT_REVIEW_MODEL` optionally overrides the
default review model; `OPENAI_API_KEY` remains server-only.

V1.3 adds versioned Test Cases with objective, preconditions, structured steps
and expected results, review/approval, and direct Requirement traceability.
Automation status is separate so future Playwright browser, API, and
integration engines can create reviewable artifacts from approved versions.

V1.4 adds Test Runs pinned to an approved TestCaseVersion. Manual, Playwright
Browser, and API modes store environment/browser metadata and append immutable
attempts with overall/per-step results, duration, failure details, and evidence
links. Retrying creates another attempt instead of overwriting history.

V1.5 adds advisory AI Failure Intelligence for failed and blocked attempts. It
uses the OpenAI Responses API with Structured Outputs, validates every cited
quote against immutable stored evidence, records model/prompt/schema/token
metadata, and requires a Lead or Owner/Admin to confirm or dismiss findings.
`OPENAI_FAILURE_ANALYSIS_MODEL` optionally overrides the default analysis model.

Phase 1A uses these environment variable names:

- `DATABASE_URL`: the PostgreSQL connection used by the application at runtime and by local development migration work when no direct connection is configured.
- `DIRECT_URL`: the optional direct PostgreSQL connection preferred by Prisma migration commands when a pooled runtime connection is unsuitable.
- `TEST_DATABASE_URL`: a physically separate PostgreSQL database used only by integration tests. It must identify a dedicated test database and never falls back to either development variable.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`

Configure a Clerk Dashboard webhook endpoint at `/api/webhooks/clerk` and set `CLERK_WEBHOOK_SIGNING_SECRET` locally and in the deployment environment. Subscribe it to:

- `user.created`, `user.updated`, `user.deleted`
- `organization.created`, `organization.updated`, `organization.deleted`
- `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`

Local webhook delivery requires a secure tunnel to the local application. Do not place webhook secret values in documentation or source control.

Reconcile one Clerk organization without writing by default:

```bash
npm run clerk:reconcile -- --organization-id org_example
# or
npm run clerk:reconcile -- --slug workspace-slug
```

After reviewing the dry-run counts, explicitly add `--apply` to write the scoped reconciliation. The command never sweeps all organizations by default.

Database commands:

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev
npm run test:database
```

Never commit credentials, secrets, `.env`, or `.env.local`. Never run development migration or database reset commands against production from a developer laptop.
