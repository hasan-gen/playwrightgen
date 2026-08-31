# Authenticated Preview Testing

This suite exercises the isolated, protected Vercel Preview through a real
Clerk session. It is read-only and must never target Production.

## Required protected values

- `PLAYWRIGHT_PREVIEW_BASE_URL`: the immutable or stable Preview origin.
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: the dedicated non-production
  Clerk instance.
- `E2E_CLERK_USER_EMAIL`: a dedicated `+clerk_test` principal that already
  belongs to the isolated Preview organization.
- `E2E_ORGANIZATION_SLUG`: the isolated organization slug.
- `E2E_PROJECT_ID`: a project in that organization used only for read checks.
- `VERCEL_AUTOMATION_BYPASS_SECRET`: required when Vercel Deployment Protection
  is enabled.

The generated Clerk browser state is written under `playwright/.clerk/` and is
ignored by Git. The test never prints keys, tokens, email addresses, cookies,
or browser state.

Run `npm run test:preview:authenticated` only after the target Preview reports
Ready and its database migrations and identity reconciliation have passed.

The hosted workflow is intentionally manual until repository ownership is
recovered or transferred and protected repository secrets can be configured.
Production promotion remains a separate explicit approval.
