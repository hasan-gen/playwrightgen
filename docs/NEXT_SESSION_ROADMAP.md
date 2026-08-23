# Next Session Roadmap

This file is the durable handoff for the next PlaywrightGen engineering session.
Update it at the end of every completed milestone or whenever the immediate
priority changes. `docs/CHECKPOINT_STATUS.md` remains the authoritative ledger;
repository evidence overrides stale prose.

## Current position

- Current checkpoint: **V1.7 Quality Command Center — complete**.
- Current checkpoint commit: `e86c601`.
- Next checkpoint: **V1.8 Repository, CI, and isolated execution**.
- Product priority: reach the first safe production preview quickly without
  weakening tenant isolation, human review, evidence integrity, or launch gates.

## Tomorrow's primary outcome

Begin the repository-to-evidence workflow so a real team can connect an
existing Playwright project instead of repeatedly copying prompts and code.
The first vertical slice should make repository configuration reviewable and
project-scoped; it must not execute untrusted repository code yet.

## Tomorrow's working sequence

1. **Reconfirm the production critical path**
   - Re-read the master plan, architecture, checkpoint ledger, decisions, and
     production-readiness gates.
   - Inspect the clean branch, migrations, tests, and deployed-environment
     assumptions before changing code.
   - Use current official GitHub, Playwright, Next.js, Prisma, Clerk, OpenAI,
     Vercel, and Stripe documentation for any decision that can change.

2. **Design the GitHub integration boundary**
   - Choose the least-privilege GitHub App permissions and organization/project
     ownership model.
   - Define installation, repository, branch, and connection lifecycle state.
   - Keep tokens encrypted and server-only; never expose them to the browser,
     logs, Activity metadata, or AI prompts.
   - Record the architecture decision before implementing credential storage.

3. **Build the first repository import slice**
   - Add tenant-scoped connection/import domain records through a Prisma
     migration.
   - Import Playwright configuration and test inventory as preliminary evidence.
   - Preserve source paths, commit SHA, timestamps, and import status.
   - Do not mark imported tests approved, current, passing, or trusted.
   - Show imported evidence and limitations inside the project Workspace.

4. **Specify the isolated runner contract**
   - Define immutable inputs, allowed commands, time/resource/network limits,
     secret injection, artifact capture, cancellation, and cleanup.
   - Define idempotent result ingestion for traces, screenshots, logs, and test
     metadata.
   - Do not run arbitrary remote repository code until the isolation boundary
     and abuse controls are reviewed and tested.

5. **Continue the usability pass**
   - Preserve the slate/cyan/blue/white palette.
   - Keep compact pill navigation, calm typography, and one focused workbench.
   - Reduce duplicate controls and explanatory text only when trust remains clear.
   - Verify every new flow on desktop and mobile with useful empty, loading,
     error, permission, and missing-evidence states.

6. **Validate and checkpoint**
   - Add domain, tenant-isolation, permission, idempotency, and failure tests.
   - Run relevant tests, the full suite, typecheck, changed-file lint, browser
     checks, and a production build.
   - Review the final diff, update the checkpoint ledger and decisions, then
     create a checkpoint commit.

## First production preview critical path

The first live preview should be powerful because the core workflow is real,
not because it contains many disconnected features. Before production approval:

- complete the production environment inventory and secret rotation plan;
- use production PostgreSQL migrations and verify backup/recovery procedures;
- configure Clerk production domains, webhooks, redirect URLs, and organization
  behavior;
- verify rate limits, request-size limits, safe error responses, and abuse
  controls for every public AI route;
- add AI evaluation datasets for generation, coverage review, failure analysis,
  and automation generation;
- add observability for application errors, AI latency/cost, webhook failures,
  database health, and future runner jobs without logging secrets or raw PII;
- complete privacy, terms, retention, deletion, and support-contact review;
- deploy and validate a Vercel preview before requesting explicit production
  approval;
- keep paid checkout unavailable until real entitlements, webhook fulfillment,
  reconciliation, support terms, and billing tests pass.

## Product success standard

PlaywrightGen should help a QA engineer, SDET, developer, or project lead move
from real intent to reviewable tests and trustworthy evidence faster than their
current workflow. Model output alone is not success. Judge improvements by:

- time to first useful reviewed Test Case;
- approved Requirement coverage by approved Test Cases;
- current-version automation coverage;
- first-run pass rate and evidence completeness;
- failure-analysis accuracy and human confirmation rate;
- GitHub/CI activation, weekly retained projects, latency, and cost;
- absence of cross-tenant access, secret exposure, false evidence claims, and
  unreviewed automatic changes.

## Persistent handoff rule

At the end of every future work session:

1. update the current position and next primary outcome in this file;
2. update `docs/CHECKPOINT_STATUS.md` when checkpoint state changes;
3. record material architecture decisions in `docs/DECISIONS.md`;
4. leave the working tree clean or clearly document intentional unfinished work;
5. state the exact first action for the next session.

**Exact first action tomorrow:** audit the current GitHub/CI-related code and
official GitHub App guidance, then write the least-privilege connection and
repository-import architecture decision before adding schema or credentials.
