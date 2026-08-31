# Stripe Billing Runbook

This runbook covers the organization-scoped Team subscription foundation. It
does not authorize a Production launch. Paid checkout remains fail-closed until
every gate below is recorded and explicit Production approval is given.

## Authority and isolation

- Clerk proves the signed-in user and active external organization.
- PostgreSQL owns the PlaywrightGen Organization, roles, Stripe customer
  binding, subscriptions, entitlements, and audit activity.
- Email is descriptive only and is never a subscription or entitlement key.
- Preview uses Stripe test mode and its own webhook endpoint secret. Production
  uses Stripe live mode and a different endpoint secret.
- Do not copy Stripe customers, webhook secrets, or subscription rows between
  environments.

## Required variables

| Variable | Preview | Production |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Stripe test-mode restricted/secret key | Stripe live-mode restricted/secret key |
| `STRIPE_TEAM_PRICE_ID` | Test-mode Team recurring Price ID | Live-mode Team recurring Price ID |
| `STRIPE_WEBHOOK_SECRET` | Secret for the exact Preview endpoint | Secret for the exact Production endpoint |
| `STRIPE_ENVIRONMENT` | `test` | `live` |
| `NEXT_PUBLIC_APP_URL` | Immutable protected Preview origin during validation | Approved canonical Production origin |
| `STRIPE_CHECKOUT_ENABLED` | Omit until test lifecycle validation; set to `true` only for the bounded test | Omit until explicit Production approval |

Never paste values into issues, logs, screenshots, documentation, or commits.

## Stripe endpoint

Register the exact HTTPS route:

`https://<environment-origin>/api/stripe/webhook`

Subscribe only to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The route verifies the raw-body signature before parsing, rejects payloads over
1 MB, requires the configured test/live mode, stores only normalized metadata
and a payload digest, and never stores the raw payload.

## Preview validation sequence

1. Run hosted CI against a disposable PostgreSQL service so every migration and
   billing integration test passes.
2. Back up or snapshot the isolated Preview branch, apply the reviewed migration
   with `prisma migrate deploy`, and confirm `prisma migrate status` is current.
3. Configure the Preview test-mode variables and endpoint. Leave checkout off.
4. Confirm the Billing page loads for Owner/Admin and a Member cannot manage it.
5. Temporarily enable checkout only for the bounded test organization.
6. Complete Stripe test Checkout and verify one organization customer, one Team
   subscription, and the three Team entitlements appear.
7. Replay the same delivery and confirm it is recorded once with no duplicate
   Activity. Send an older lifecycle event and confirm it cannot restore access.
8. Cancel through the customer portal and verify entitlements are disabled when
   no active/trialing Team subscription remains.
9. Disable checkout again. Record redacted event IDs, deployment SHA, migration
   status, and test results in the checkpoint ledger.

## Failure and rollback

- If configuration is missing, Checkout and webhooks return safe unavailable
  errors; they never grant access.
- If customer or subscription ownership conflicts across organizations, stop
  processing and investigate. Never reassign the row manually.
- If the app deployment fails after the additive migration, roll back the app
  deployment first. The additive tables can remain unused while checkout is off.
- Do not drop billing tables or enum values as an emergency rollback. Prepare a
  reviewed forward migration after preserving evidence.
- Stripe remains the payment-system record; PostgreSQL remains the application
  entitlement projection. A reconciliation operation must be added and tested
  before Production launch.

## Remaining Production gates

- Isolated test-mode lifecycle E2E and replay evidence.
- Subscription reconciliation and alerting for failed/stale deliveries.
- Rate limits and abuse controls around checkout and portal session creation.
- Final plan limits, pricing, tax, invoices, refunds, cancellation, support, and
  privacy/terms review.
- Backup/restore and migration rollback rehearsal on a disposable branch.
- Protected Preview release candidate and explicit Production approval.
