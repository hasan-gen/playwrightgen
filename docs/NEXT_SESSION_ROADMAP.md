# Next Session Roadmap

This file is the durable handoff for the next PlaywrightGen engineering session.
Update it at the end of every completed milestone or whenever the immediate
priority changes. `docs/CHECKPOINT_STATUS.md` remains the authoritative ledger;
repository evidence overrides stale prose.

## Current position

- Current checkpoint: **V1.8 Repository, CI, and isolated execution — in progress**.
- Current checkpoint commit: repository-import foundation checkpoint.
- Completed slice: least-privilege architecture, tenant-safe repository import
  foundation, read-only GitHub client, runner contract, and Repository evidence UI.
- Product priority: reach the first safe production preview quickly without
  weakening tenant isolation, human review, evidence integrity, or launch gates.

## Next primary outcome

Complete the signed GitHub App installation lifecycle and connect one real,
selected repository to a project through the new import boundary. Keep imported
records preliminary and keep untrusted execution disabled.

## Next working sequence

1. **Build the signed GitHub installation lifecycle**
   - Add raw-body HMAC-SHA256 webhook verification with timing-safe comparison.
   - Process `installation` and `installation_repositories` idempotently without
     storing raw payloads, tokens, or unnecessary account data.
   - Disable imports on suspension, removal, or repository access removal while
     retaining historical evidence.

2. **Build the organization-scoped setup flow**
   - Generate signed, expiring setup state for an Owner/Admin and exact project.
   - Verify the returned installation through GitHub before binding it.
   - List only repositories accessible to that installation and connect the
     selected repository through the existing composite tenant service.

3. **Prove one real repository import**
   - Ask for one GitHub dashboard action only after the callback is locally ready.
   - Import one selected repository at an exact commit and verify displayed
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

**Exact first action next session:** implement timing-safe GitHub webhook
verification and idempotent `installation` / `installation_repositories`
lifecycle handling, then expose a signed organization-scoped installation setup
flow. Ask for the one required GitHub dashboard action only after the local
callback and tests are ready.
