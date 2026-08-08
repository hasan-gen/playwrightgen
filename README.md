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

This checkpoint prepares tooling for a future tenant-safe workspace. Authentication, organizations, projects, tenant isolation, workspace pages, and workspace APIs are not implemented yet.

Future Phase 1A configuration uses these environment variable names:

- `DATABASE_URL`
- `DIRECT_URL`
- `TEST_DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`

Development requires a PostgreSQL database and a direct PostgreSQL connection for migration work. Automated tests must use a separate database through `TEST_DATABASE_URL`; test tooling must never fall back to a development or production database. Clerk work will require a Clerk account and application before authentication integration begins.

The following commands are prepared for later checkpoints:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:run
npm run test:coverage
npm run test:authorization
npm run prisma:generate
npm run prisma:format
npm run prisma:validate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
```

The Prisma commands that require a schema will fail until `prisma/schema.prisma` is intentionally added in a later checkpoint. When `NODE_ENV=test`, Prisma configuration requires `TEST_DATABASE_URL` and does not fall back to `DATABASE_URL` or `DIRECT_URL`.

Never commit secrets or local environment files. Never run migration commands against a production database from a developer laptop.
