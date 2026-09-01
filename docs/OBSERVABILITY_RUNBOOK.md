# Operational observability runbook

Operational logs are evidence for availability and incident response, not a
secondary datastore. They must never contain prompts, source uploads, raw
webhook bodies, signatures, secrets, tokens, email addresses, or raw provider
errors.

## Structured events

All supported events are one-line JSON with a UUID `requestId`, bounded
`durationMs`, a fixed `event` and `surface`, and one of `succeeded`, `rejected`,
or `failed`.

- `ai.request` records the public AI surface, safe result code, latency, token
  totals, and provider request ID when available.
- `webhook.delivery` records only `clerk-webhook`, `github-webhook`, or
  `stripe-webhook`, the safe result/error code, latency, and request ID.

HTTP webhook responses return the same request ID in `x-request-id` and set
`Cache-Control: no-store`. Provider delivery IDs remain in the tenant-scoped,
idempotent PostgreSQL delivery records rather than logs.

## Preview alert proof

Before a release candidate, connect Vercel structured logs to the selected
monitoring destination and prove alerts for:

1. any sustained `failed` webhook delivery;
2. a sustained increase in `invalid_signature` or `payload_too_large` without
   paging on a single rejected bot request;
3. public AI provider/configuration failures or a sudden rate-limit spike;
4. database connection exhaustion or migration-target verification failure;
5. Stripe environment mismatch, stale-event conflicts, and entitlement drift.

Record the redacted request ID, deployment ID, alert receipt time, responder,
and resolution. Do not paste provider payloads or environment variables into
the incident record.

## Incident boundary

- Disable checkout or the affected feature flag before investigating billing
  or AI cost anomalies.
- Keep signed webhook endpoints fail-closed; do not bypass signature checks to
  restore delivery.
- Use provider dashboards plus PostgreSQL delivery state for reconciliation.
- Rotate only the affected secret and preserve independent automation,
  webhook, and application credentials.
- Production alert ownership and escalation contacts must be assigned before
  paid launch.
