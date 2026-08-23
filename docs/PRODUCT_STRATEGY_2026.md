# PlaywrightGen Product Strategy 2026

## Product thesis

PlaywrightGen should not compete as another prompt-to-test generator. Playwright
itself now provides planner, generator, and healer agents, while larger testing
platforms already offer AI test creation, maintenance, execution, and failure
analysis.

PlaywrightGen wins by becoming the **evidence-backed quality operating system
for Playwright teams**. It answers one recurring question:

> Can we ship this change safely, what evidence supports that answer, and what
> is the next highest-value quality action?

Every claim must be derived from inspectable project evidence. AI can plan,
generate, classify, and recommend, but it never silently approves intent,
changes trusted automation, or declares a release safe.

## Initial market wedge

### Primary team

Small and mid-sized SaaS product teams with roughly 5–50 engineers that:

- already use Playwright or are actively adopting it;
- have one or a few QA/SDET engineers supporting many developers;
- ship frequently and struggle to connect requirements, tests, failures, and
  release decisions;
- cannot justify the setup or cost of a large enterprise test platform; and
- value code ownership, reviewable output, and GitHub/CI workflows.

### Champion, users, and buyer

- **Champion:** QA lead, SDET, or senior automation engineer.
- **Daily users:** QA engineers, developers, and project leads.
- **Decision consumer:** Engineering manager or release owner.
- **Economic buyer:** Engineering or quality leader once team collaboration,
  CI execution, and release evidence prove recurring value.

### Core job to be done

When a requirement or code change is ready, help the team identify missing
coverage, create reviewable Playwright automation, run the right tests, explain
failures with evidence, and make the release risk visible without maintaining
separate documents and disconnected AI chats.

## Product surface model

### Free tools: acquisition and first value

The existing public tools remain available without forcing a workspace setup,
but their purpose becomes explicit:

1. **Quick Generate** (`/generator`) — create a disposable first Playwright
   draft from a requirement, HTML, API description, or component.
2. **Coverage Review** (`/intelligence`) — inspect pasted requirements and
   tests for likely gaps and risky patterns.
3. **Release Review** (`/engineering-review`) — get a preliminary change-risk
   review from supplied evidence.

These are not separate products and must not pretend to have project history.
Each result should offer one clear transition into a workspace: save the input,
review it as a real Requirement/Test Case, and continue with durable evidence.

### Workspace: retention, trust, and monetization

`/workspace` is the actual application. It provides:

- organization and project isolation;
- roles, approvals, and append-only activity history;
- immutable Requirement and Test Case versions;
- Requirement-to-Test Case traceability;
- separate versioned Browser and API automation engines;
- immutable execution attempts and failure evidence; and
- project/release intelligence computed from those records.

The workspace turns a one-time generation into a repeated team workflow. It is
also where collaboration, runner usage, integrations, and future billing can
be owned safely by an organization.

## Product information architecture

The public navigation should communicate one product, not unrelated tabs:

- **Product** — workflow and proof, not a feature inventory.
- **Free Tools** — Quick Generate, Coverage Review, Release Review.
- **Workspace** — the signed-in system of record.
- **Pricing** — only claims supported by real entitlements.

Inside a project, the durable workflow remains:

```text
Quality Command Center
  -> Requirements
  -> Test Cases
  -> Automation
  -> Runs
  -> Failures and release evidence
```

## What to encourage

- Start from a real requirement, change, URL, repository, or failing run.
- Keep a human-readable test plan paired with executable automation.
- Prefer accessible, user-facing Playwright locators and observable assertions.
- Verify generated selectors and assertions against the live application.
- Keep Browser and API automation as separate engines.
- Show source records, confidence, freshness, and missing evidence for every
  intelligence claim.
- Put generated code through deterministic validation, human approval, and an
  isolated runner before it can become trusted.
- Integrate with GitHub and CI so quality work appears where teams already ship.
- Evaluate every AI workflow against representative datasets before changing
  models, prompts, or reasoning settings.

## What to stop or avoid

- Do not position generic prompt-to-code as the main product.
- Do not invest further in Figma-to-code; it dilutes the quality mission.
- Do not keep Debug as a disconnected form; failure analysis belongs to an
  immutable failed run.
- Do not publish unsupported coverage or release-readiness scores from a single
  pasted prompt.
- Do not silently self-heal approved tests or hide changed behavior.
- Do not build a general cloud browser grid before proving the quality workflow.
- Do not add production billing before activation, retention, runner safety,
  observability, and deployment gates are real.

## Delivery sequence

### Milestone A — Product surface unification (next visible milestone)

- Replace the legacy navigation with Product, Free Tools, Workspace, Pricing.
- Rename and frame the three public routes around outcomes.
- Give all public tools a shared visual system and honest “free analysis” scope.
- Add a clear Save/Continue in Workspace path without inventing persistence.
- Rewrite the home page around the quality evidence loop and primary team.

**Success:** A new visitor understands who the product is for, the difference
between free tools and Workspace, and the first action within 30 seconds.

### Milestone B — V1.7 Quality Command Center

- Add a project Intelligence route backed only by real records.
- Show deterministic Requirement coverage, automation readiness, recent run
  health, unresolved failures, and evidence freshness.
- Prioritize actionable gaps: approved Requirements without tests, approved
  Test Cases without automation, failed runs without reviewed analysis, and
  stale automation pinned to superseded intent.
- Link every number and recommendation to its source records.
- Express uncertainty when required evidence is missing.

**Success:** A project lead can identify and open the highest-risk gap in under
one minute without pasting project context into a form.

### Milestone C — Repository, CI, and isolated execution loop

- Connect GitHub at organization/project scope.
- Import existing Playwright configuration, fixtures, specs, and test results.
- Run approved artifacts in an isolated, time/resource-limited environment.
- Persist traces, screenshots, logs, and result metadata safely.
- Report status on pull requests and ingest CI results idempotently.
- Export or propose code changes through a reviewable branch/PR flow.

**Success:** A team reaches a verified Playwright result from an existing repo
and sees it on a pull request without manually copying generated code.

### Milestone D — Agentic planning, generation, and repair

- Explore the application with explicit seed/auth state and bounded tools.
- Generate human-readable plans before executable tests.
- Verify selectors and assertions live.
- Diagnose failed automation and propose versioned patches.
- Re-run only inside guardrails; never auto-approve a repaired artifact.
- Measure planning coverage, first-run pass rate, false repair rate, latency,
  and cost through evals.

**Success:** The agent closes a measured coverage gap with reviewable evidence,
not merely syntactically valid code.

### Milestone E — Production launch and growth loop

- Complete authenticated browser E2E, monitoring, rate/budget controls,
  retention/privacy controls, and preview deployment gates.
- Offer a free solo project with bounded AI usage.
- Validate paid team value around collaboration, integrations, execution, and
  release evidence before finalizing pricing.
- Publish reproducible examples, GitHub templates, and comparison/eval results.

**Success:** Teams activate, return weekly, invite collaborators, and trust the
outputs enough to use them in real release workflows.

## Product metrics

### Activation

- Project created or repository connected.
- First approved Requirement/Test Case pair.
- First approved automation artifact.
- First verified execution result.

### Recurring value

- Weekly projects with a new run, failure analysis, or coverage action.
- Percentage of approved Requirements with Test Case coverage.
- Percentage of approved Test Cases with approved, passing automation.
- Median time from failed run to reviewed diagnosis.
- Collaborators invited and active per organization.

### AI quality

- Structured-output and local-validation pass rate.
- Human acceptance/change-request rate.
- Generated test first-run pass rate.
- Evidence citation accuracy and false-positive rate.
- Repair success without weakening assertions.
- Token cost and latency per accepted artifact.

### Business validation

- Free-tool result to workspace activation conversion.
- Repository/CI connection rate.
- Four-week team retention.
- Free-to-paid conversion after repeated team value.

## Current truth

The tenant-safe Workspace foundation and the Requirement → Test Case →
Automation → Run → Failure evidence chain exist through V1.6. The legacy public
tools have not yet been unified with that product and should be treated as
acquisition surfaces, not evidence-backed project intelligence. V1.7 and the
repository/runner loop are required before PlaywrightGen can make a credible
delivery-confidence claim or launch as a production product.

## Market and technical references

- Playwright Test Agents: https://playwright.dev/docs/test-agents
- Playwright resilient locator guidance: https://playwright.dev/docs/locators
- Playwright CI guidance: https://playwright.dev/docs/ci
- OpenAI current model and tool guidance:
  https://developers.openai.com/api/docs/guides/latest-model
- OpenAI Evals API: https://platform.openai.com/docs/api-reference/evals
- BrowserStack Test Management AI:
  https://www.browserstack.com/test-management/ai-agents
- Momentic agentic quality platform: https://momentic.ai/
