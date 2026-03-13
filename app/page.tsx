import Link from "next/link";

const availableNow = [
  {
    title: "Prompt to Test",
    description:
      "Describe a user flow in plain English and generate production-ready Playwright code in seconds.",
  },
  {
    title: "Component to Test",
    description:
      "Paste React components or JSX and generate Playwright tests or unit test coverage from the same source.",
  },
  {
    title: "API Test Generation",
    description:
      "Generate realistic Playwright API tests for authentication, profile, and endpoint validation workflows.",
  },
  {
    title: "HTML / JSX to Locator",
    description:
      "Turn HTML snippets into stronger selectors and more practical automation output for modern UI testing.",
  },
  {
    title: "URL-Aware Generation",
    description:
      "Use a page URL as extra context to guide more realistic browser test creation and user-flow coverage.",
  },
  {
    title: "Daily Free Plan",
    description:
      "Ship with a real SaaS-style free plan that supports 5 generations per day with Redis-backed usage control.",
  },
];

const futureItems = [
  {
    title: "Agentic URL Analysis",
    description:
      "Analyze a live page, infer likely user journeys, and generate more complete Playwright coverage automatically.",
  },
  {
    title: "Multi-Test Suite Generation",
    description:
      "Create related tests for login, validation, navigation, search, and critical flows from a single input.",
  },
  {
    title: "AI Test Architecture Helpers",
    description:
      "Generate reusable flows, page object ideas, and smarter production-ready test structures for modern projects.",
  },
  {
    title: "Saved Test Workspace",
    description:
      "Store generated outputs, compare versions, and reuse successful automation drafts across future sessions.",
  },
  {
    title: "Project-Level Test Generation",
    description:
      "Expand beyond single prompts into broader automation planning for pages, components, and application workflows.",
  },
  {
    title: "Pro Plan",
    description:
      "Unlock higher limits, more advanced AI workflows, and stronger productivity features for teams and power users.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-gray-500 sm:text-sm">
              AI for developers, automation engineers, and SDETs
            </p>

            <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-black md:text-6xl">
              Generate Playwright tests in seconds
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Generate, analyze, and scale Playwright automation from prompts,
              components, HTML snippets, APIs, and real page URLs.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/generator"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-black px-6 py-3 text-base font-medium text-white transition hover:opacity-90 sm:min-w-[190px] sm:w-auto"
              >
                Start Generating
              </Link>

              <Link
                href="/pricing"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-800 transition hover:bg-gray-50 sm:min-w-[130px] sm:w-auto"
              >
                Pricing
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
                Prompt → Test
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
                Component → Test
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
                HTML → Locator
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
                API → Test
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
                Free Plan
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <div className="h-3 w-3 rounded-full bg-gray-300" />
            </div>

            <div className="overflow-x-auto rounded-2xl bg-black p-4 text-xs text-green-400 sm:p-5 sm:text-sm">
              <pre className="min-w-[260px] whitespace-pre-wrap">{`import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("https://example.com/login");

  await page.getByPlaceholder("Enter email")
    .fill("test@example.com");

  await page.getByPlaceholder("Enter password")
    .fill("Password123");

  await page.getByRole("button", { name: "Login" })
    .click();

  await expect(page).toHaveURL(/dashboard/);
});`}</pre>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-gray-500 sm:text-sm">
              Available now
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
              What PlaywrightGen can do today
            </h2>

            <p className="mt-4 max-w-3xl text-gray-600">
              PlaywrightGen already supports practical AI-powered workflows for
              real test automation work. The goal is not flashy output. The goal
              is useful output that saves time for engineers.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {availableNow.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-3 text-xl font-semibold text-black">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-black px-6 py-8 text-white sm:px-8 sm:py-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-gray-300 sm:text-sm">
            Built for real teams
          </p>

          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            A simple UI with powerful automation output
          </h2>

          <p className="mt-4 max-w-3xl text-gray-300">
            PlaywrightGen is designed for developers, automation engineers, and
            SDETs who want cleaner selectors, faster test generation, and
            practical AI-assisted automation workflows without the noise of a
            bloated platform.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-2 text-lg font-semibold">Cleaner selectors</h3>
              <p className="text-sm text-gray-300">
                Focus on practical output using more stable selector patterns and
                readable test structure.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-2 text-lg font-semibold">Faster iteration</h3>
              <p className="text-sm text-gray-300">
                Move from idea to usable automation faster without starting every
                test from scratch.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-2 text-lg font-semibold">Real engineering use</h3>
              <p className="text-sm text-gray-300">
                Built to support actual developer, QA, and SDET workflows rather
                than generic code generation demos.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/generator"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-medium text-black transition hover:bg-gray-100 sm:min-w-[190px] sm:w-auto"
            >
              Open Generator
            </Link>

            <Link
              href="/pricing"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10 sm:min-w-[150px] sm:w-auto"
            >
              View Pricing
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-gray-500 sm:text-sm">
              Future of PlaywrightGen
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
              A more powerful AI automation roadmap
            </h2>

            <p className="mt-4 max-w-3xl text-gray-600">
              PlaywrightGen is moving toward broader AI-assisted automation:
              stronger context awareness, smarter test planning, and workflows
              that help engineering teams generate more complete coverage with
              less repetition.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {futureItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-2 text-xl font-semibold text-black">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
