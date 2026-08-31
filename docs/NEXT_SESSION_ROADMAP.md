# Next Session Roadmap

This file is the durable handoff for the next PlaywrightGen engineering session.
Update it at the end of every completed milestone or whenever the immediate
priority changes. `docs/CHECKPOINT_STATUS.md` remains the authoritative ledger;
repository evidence overrides stale prose.

## Current position

- Current checkpoint: **V1.8 Repository, CI, and isolated execution — in progress**.
- Current validated deployment baseline: commit `58814e3`, authenticated Vercel
  Preview deployment `dpl_514c7AdqXsyeB65odPBjnhGD1Rug`, and successful
  hosted CI run `33337224482` for full SHA
  `58814e3aba30dbc345eb85b00014c1c904a0dc4a`. Commit `ea89393` adds the
  authenticated Preview release harness; live execution still requires a
  dedicated test principal and explicitly approved automation bypass.
- Completed slice: least-privilege architecture, tenant-safe repository import
  foundation, read-only GitHub client, runner contract, Repository evidence UI,
  signed idempotent installation/repository-access lifecycle handling, signed
  setup state, PKCE user verification, strict App verification, live
  repository selection, canonical public-repository URL verification, and a
  usable exact-commit import action in Workspace.
- Product priority: reach the first safe production preview quickly without
  weakening tenant isolation, human review, evidence integrity, or launch gates.
- Ownership finding: `hasan-gen` is a separate GitHub user and owns the public
  repository; the interactive browser account is `hmamut39`. The development
  App authorization created no installation, connection, or import record in
  PostgreSQL, so no tenant data was attached incorrectly.
- Preview isolation is complete: Neon branch `br-hidden-mode-ax99b5h6` was
  created schema-only, its schema matched the nine reviewed migrations before
  they were baselined, Clerk reconciliation reached zero drift, and an
  authenticated user reached the isolated Workspace. No production rows were
  copied and Production was not deployed.
- The authenticated Owner created the first Preview project successfully.
- The GitHub App is already installed on `hmamut39` as installation
  `157602553` with metadata/contents read only and all-repository selection.
  The setup flow now supports securely verifying an existing installation
  without uninstalling it.
- Preview verified and bound that installation, connected the cross-owner
  public repository `hasan-gen/playwrightgen`, and pinned `main@e65879da`.
  The parser correctly marked the snapshot incomplete: main contains three
  support files but no Playwright configuration or spec files. The import UI
  now accepts a branch, tag, or commit. Importing `hasan_genai@58814e3a`
  succeeded with one config, 24 spec files, 190 test declarations, and three
  support files.
- The organization-scoped Stripe foundation is implemented locally: additive
  Prisma migration, one customer binding per Organization, lifecycle
  subscriptions, materialized Team entitlements, signed/idempotent webhook
  handling, stale-event and cross-tenant rejection, a locked Checkout path,
  customer portal, authenticated Billing UI, and a test-mode runbook. Hosted
  migration/lifecycle validation is the next evidence gate; paid checkout is
  still disabled.

## Next primary outcome

Validate the organization-billing migration and lifecycle tests in hosted CI,
then apply the additive migration to the isolated Preview branch and exercise a
Stripe test-mode endpoint with Checkout locked by default. Continue the
dedicated Clerk test-principal and isolated Clerk/GitHub webhook work without
creating a Vercel automation bypass unless the user explicitly approves that
security configuration. Keep imported records preliminary, untrusted execution
disabled, and Production untouched.

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
   - Complete: the public PlaywrightGen repository was imported at exact ref
     `hasan_genai@58814e3a`; Preview displayed one config, 24 spec files, 190
     test declarations, and three support files.
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

**Exact first action next session:** inspect the hosted CI result for the
organization-billing checkpoint. If green, record the run and prepare a
snapshot-backed migration of only the isolated Preview database; if red, fix the
failing migration/test evidence before any environment change.
