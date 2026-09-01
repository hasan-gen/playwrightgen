# AI Operations Runbook

This runbook covers cost and abuse controls for PlaywrightGen AI workflows. It
does not authorize a Production release.

## Enforced controls

- Public Quick Generate, Coverage Review, and Release Review reserve quota in
  Redis atomically before file conversion or an OpenAI request.
- Public clients are represented only by an HMAC-SHA256 fingerprint. Raw IP
  addresses are not stored in Redis keys or operational logs.
- Public defaults are two requests per rolling 60-second window and five per
  UTC day, independently per surface and fingerprint.
- Authenticated Workspace AI uses a PostgreSQL Organization UUID as the quota
  boundary. Defaults are four requests per rolling 60-second window and 20 per
  UTC day across Requirement Review, Failure Analysis, and Automation
  Generation.
- Every OpenAI workflow has a finite output-token ceiling. Existing Workspace
  persistence continues to record provider model and token usage.
- Public AI requests propagate a UUID `X-Client-Request-Id` to OpenAI and return
  an `x-request-id` response header. Operational logs contain only allowlisted
  fields: surface, safe outcome code, duration, token counts, and provider
  request ID.
- Superseded AI routes are quarantined with `410 Gone` by default. They remain
  present during migration but cannot execute provider calls or the legacy URL
  fetch path unless `ENABLE_LEGACY_AI_ROUTES=true` is deliberately configured.

## Environment controls

| Variable | Purpose | Production rule |
| --- | --- | --- |
| `RATE_LIMIT_HASH_SECRET` | Dedicated HMAC key for public-client fingerprints. | Set to a unique high-entropy secret; never expose it to the browser or logs. |
| `ORGANIZATION_AI_MINUTE_LIMIT` | Optional authenticated organization burst limit. | Keep bounded; default `4`. |
| `ORGANIZATION_AI_DAILY_LIMIT` | Optional authenticated organization daily request budget. | Keep bounded; default `20` until plan-specific metering is approved. |
| `ENABLE_LEGACY_AI_ROUTES` | Temporary migration escape hatch. | Leave absent. Production must not set this to `true`. |

The public daily and burst limits are intentionally code-owned for the initial
beta. Changing them is a reviewed code change. Paid plan expansion must derive
from the organization entitlement projection in PostgreSQL; do not trust email,
client flags, or Redis as entitlement authority.

## Monitoring and alerts

Vercel logs should parse the JSON events `public_ai.completed`,
`public_ai.rejected`, and `public_ai.failed`. Alert on:

- sustained provider or configuration failures;
- a sharp increase in daily-limit or burst-limit rejection rate;
- latency regressions by AI surface;
- token totals or average output tokens rising materially from the release
  candidate baseline;
- missing request IDs or malformed structured events.

Do not add prompts, uploaded files, raw errors, webhook bodies, access tokens,
email addresses, or IP addresses to logs. Provider investigations should begin
with the PlaywrightGen request ID and associated OpenAI request ID.

## Failure behavior

- Rate limits return `429`, a generic message, `Retry-After`, and
  `x-request-id`.
- Missing server configuration returns `503` without naming secret variables.
- Invalid or refused model output returns `502` and does not become approved
  Workspace evidence.
- Unexpected failures return a generic safe response; diagnostic details stay
  server-side and must conform to the structured telemetry allowlist.

## Release evidence still required

Before Production, exercise all three public surfaces and all three Workspace
AI workflows on the protected Preview, capture rate-limit behavior, confirm
structured log ingestion and alerts, and establish a token/cost baseline. Add
representative model eval datasets and organization-entitlement-aware paid
limits before enabling paid AI claims.
