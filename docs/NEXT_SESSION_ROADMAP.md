# Next Session Roadmap

This file is the durable handoff for the next PlaywrightGen engineering session.
Update it at the end of every completed milestone or whenever the immediate
priority changes. `docs/CHECKPOINT_STATUS.md` remains the authoritative ledger;
repository evidence overrides stale prose.

## Current position

- Current checkpoint: **V1.8 Repository, CI, and isolated execution — in progress**.
- Current checkpoint commit: public repository evidence checkpoint `b7b8bfb`.
- Completed slice: least-privilege architecture, tenant-safe repository import
  foundation, read-only GitHub client, runner contract, Repository evidence UI,
  signed idempotent installation/repository-access lifecycle handling, signed
  setup state, PKCE user verification, strict App verification, live
  repository selection, canonical public-repository URL verification, and a
  usable exact-commit import action in Workspace.
- Product priority: reach the first safe production preview quickly without
  weakening tenant isolation, human review, evidence integrity, or launch gates.

## Next primary outcome

Install the dedicated development GitHub App on the browser-accessible GitHub
account, connect the public PlaywrightGen repository through the completed
secure setup boundary, and prove an exact-commit import. The public repository
may belong to a different GitHub owner because PlaywrightGen now verifies its
identity and public visibility live. Keep imported records preliminary and
keep untrusted execution disabled.

## Next working sequence

1. **Complete the signed GitHub installation lifecycle**
   - Raw-body HMAC-SHA256 verification, delivery idempotency, and fail-closed
     access transitions are complete.
   - Add operational visibility and a reconciliation path after the live setup
     flow is proven.

2. **Build the organization-scoped setup flow**
   - Complete: signed ten-minute state for an Owner/Admin and exact project.
   - Complete: PKCE GitHub user authorization verifies the user can access the
     installation before App-authenticated least-privilege verification.
   - Complete: live accessible-repository discovery and provider-verified
     project connection through the existing composite tenant service.

3. **Prove one real repository import**
   - Complete: Workspace can verify a public repository by canonical URL
     through a tenant-bound active App installation; private repositories
     still require explicit installation selection.
   - Complete: connected repositories expose an actual import action.
   - Ask for one GitHub installation action only after the callback is locally ready.
   - Import the public PlaywrightGen repository at an exact commit and verify displayed
     configuration, spec inventory, limitations, Activity, and tenant isolation.
   - Keep imported records preliminary and remote execution unavailable.

4. **Continue the usability and capability pass**
   - Preserve the slate/cyan/blue/white palette.
   - Keep compact pill navigation, calm typography, and one focused workbench.
   - Plan the return of Quick Debug and Figma as Failure Analysis and Visual
     Testing workflows tied to reviewable evidence.
   - Verify every new flow on desktop and mobile with useful empty, loading,
     error, permission, and missing-evidence states.

5. **Advance Preview readiness and checkpoint**
   - Add domain, tenant-isolation, permission, idempotency, and failure tests.
   - Require the checked CI workflow to pass before merge and configure branch
     protection after the repository is connected.
   - Follow `docs/VERCEL_PREVIEW_PLAN.md` without deploying production.

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

**Exact first action next session:** from the Workspace Repositories page,
start the signed GitHub setup and install the read-only App on the currently
accessible GitHub account using **All repositories**. Then connect the public
PlaywrightGen URL and prove one exact-commit import.
