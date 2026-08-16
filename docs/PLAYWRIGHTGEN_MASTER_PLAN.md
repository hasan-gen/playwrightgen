# PlaywrightGen Master Plan

## Mission

Evolve the existing Playwright generator into an AI-native test management,
quality intelligence, and delivery confidence platform that answers: **Can
this change be delivered safely?**

The product is for SDETs, QA engineers and leads, developers, engineering
managers, and release managers. It must create daily workflow value from real
project state rather than present a generic AI demo.

## Evolution strategy

Use a strangler approach. Keep the existing generator, intelligence,
engineering-review, debug, login, and browser-analysis capabilities available
until project-aware workflows replace them.

- Generator becomes **Automate this Test Case**.
- Debug Assistant becomes failed Test Run analysis.
- Test Intelligence becomes coverage, regression, and missing-test insight.
- Engineering Review becomes change-impact and delivery intelligence.
- Figma-to-code is outside the product core and receives no new investment.

## Foundation roadmap

1. Dependency and environment foundation.
2. PostgreSQL/Prisma tenant foundation.
3. Clerk-protected workspace foundation.
4. Clerk-to-PostgreSQL synchronization.
5. Server-only tenant-safe authorization.
6. Project domain services and append-only Activity.
7. Real database-backed workspace Projects experience.

## V1 workflow roadmap

After the foundation, deliver coherent vertical slices in this order:

1. Requirements with immutable versions and draft/review/approve workflow.
2. Test Cases with immutable versions and Requirement traceability.
3. Test Runs and immutable execution evidence.
4. Failure Intelligence with evidence-backed classification.
5. Playwright automation drafts generated from approved Test Case versions.
6. Project-aware coverage, change, regression, and delivery intelligence.
7. Production hardening, preview deployment, E2E validation, and launch gates.

AI remains assistive: suggestions are reviewable, evidence-linked, validated,
and never silently overwrite approved domain records.

## Current V1 progress

- Requirements and immutable RequirementVersion history: complete.
- Draft -> review -> approve workflow with change requests and archive: complete.
- Permission-aware real Requirements workspace UI: complete.
- Advisory AI Requirement Review: next.
- Test Cases, traceability, Test Runs, and later intelligence: pending.

## Product constraints

- PostgreSQL is the authoritative durable domain store.
- Clerk establishes identity and external organization membership.
- Organization and project boundaries are enforced on the server.
- Archive and removal are state transitions, not destructive deletion.
- Mutations and their Activity records share a transaction.
- Historical versions and execution evidence are immutable.
- Billing remains organization-owned when it is introduced; core workflow
  stability comes first.
