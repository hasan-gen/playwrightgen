# PlaywrightGen

AI-powered Playwright test generation platform for developers, automation engineers, and SDETs.

PlaywrightGen helps teams generate production-ready Playwright tests from prompts, components, HTML snippets, API descriptions, and page URLs.

## Features

- Prompt → Playwright test generation
- Component → Playwright test generation
- Component → unit test generation
- HTML / JSX → Playwright test generation
- API test generation
- URL analysis for more realistic browser flows
- Multiple output styles: Fast, Clean, Production
- Free / Pro product structure
- Copy code and download output
- Built with Next.js + OpenAI

## Example Use Cases

**Developers**
- Generate tests faster while building modern web applications

**Automation Engineers**
- Turn manual test ideas into automated Playwright coverage faster

**SDETs**
- Create stable locators, reusable flows, and production-ready test suites

## Tech Stack

- Next.js
- TypeScript
- OpenAI API
- TailwindCSS
- Playwright
- Cheerio

## Getting Started

Install dependencies:

```bash
npm install
```

## Phase 1A workspace foundation

Checkpoint 2 adds the PostgreSQL schema and initial Prisma migration for the future tenant-safe workspace. PostgreSQL is now required for database development. Clerk integration, organizations UI, workspace pages, workspace APIs, and application authorization are not implemented yet.

Phase 1A uses these environment variable names:

- `DATABASE_URL`: the PostgreSQL connection used by the application at runtime and by local development migration work when no direct connection is configured.
- `DIRECT_URL`: the optional direct PostgreSQL connection preferred by Prisma migration commands when a pooled runtime connection is unsuitable.
- `TEST_DATABASE_URL`: a physically separate PostgreSQL database used only by integration tests. It must identify a dedicated test database and never falls back to either development variable.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`

Clerk work will require a Clerk account and application in a later checkpoint.

Database commands:

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev
npm run test:database
```

Never commit credentials, secrets, `.env`, or `.env.local`. Never run development migration or database reset commands against production from a developer laptop.
