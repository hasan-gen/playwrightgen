# First Vercel Preview Plan

This is the production-preview critical path. A preview deployment is a release
gate, not production approval.

## Current repository state

- Local Vercel project metadata may exist for CLI operations, but `.vercel`
  remains ignored and uncommitted.
- No `vercel.json` override is required for the current Next.js application.
- The production build remains the local deployment gate.
- GitHub repository import and the signed installation/OAuth callback flow
  are configured and proven against the stable Preview origin. The exact-ref
  `hasan_genai@58814e3a` import succeeded with one config, 24 spec files, 190
  test declarations, and three support files.
- Remote repository execution remains disabled by architecture decision.

## Environment inventory

Create distinct Preview values. Do not copy development or future Production
credentials into Preview.

| Scope | Required names | Preview rule |
| --- | --- | --- |
| Database | `DATABASE_URL`, `DIRECT_URL` for migrations | Dedicated schema-only Preview PostgreSQL branch. Runtime uses the pooled URL; migrations use the direct URL. Preview branch `br-hidden-mode-ax99b5h6` contains no copied Production rows. |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` | Dedicated non-production instance/domain and endpoint. Redirect URLs must include the exact protected Preview origin. |
| OpenAI | `OPENAI_API_KEY` and optional workflow model overrides | Separate project/key, budget, rate limits, and eval gate. Never expose the key client-side. |
| GitHub App | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_SETUP_STATE_SECRET` | Dedicated development/Preview GitHub App until production review. App, OAuth, webhook, and setup-state secrets remain separate server-only values. |
| Public rate limits | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Dedicated Preview store or explicitly isolated key namespace. |
| Waitlist email | `RESEND_API_KEY` | Preview-safe sender/domain; no production mailing list side effects. |
| Billing | Stripe values used by legacy routes | Paid checkout stays unavailable until organization entitlements, signed lifecycle handling, reconciliation, and test-mode E2E pass. |

Environment values are configured in Vercel, never copied into this file or
committed. A changed Vercel environment variable affects only new deployments,
so Preview must be redeployed after any correction.

## Preview sequence

1. Require the checked CI workflow for tests, typecheck, lint, Prisma
   validation, migrations, browser checks, and build to pass on the selected
   preview commit.
2. Link the repository to a Vercel project without committing `.vercel` state.
3. Configure the isolated Preview environment inventory above.
4. Apply reviewed migrations to the Preview database with
   `prisma migrate deploy`; never use `db push`.
5. Deploy a commit-specific Preview and enable Vercel Authentication/Standard
   Protection while internal validation is in progress.
6. Smoke-test public pages, Clerk sign-in/sign-out/recovery, organization
   switching, tenant-negative paths, Workspace CRUD/review flows, public AI
   limits, webhooks, and repository empty/error states.
7. Capture deployment ID, commit SHA, migration state, smoke-test evidence,
   known limitations, and rollback choice in the checkpoint ledger.
8. Request explicit production approval only after every applicable gate in
   `docs/PRODUCTION_READINESS.md` passes.

## Rollback boundary

Application rollback uses a previously verified immutable deployment. Database
rollback is not an automatic down migration: stop promotion, assess whether the
new schema is backward compatible, restore through the reviewed database
recovery procedure only when necessary, and record the decision. Never rewrite
an applied Prisma migration.
