import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-gray-500">
              AI for developers, automation engineers, and SDETs
            </p>

            <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-black md:text-6xl">
              Generate Playwright tests in seconds
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Turn prompts, components, HTML snippets, API descriptions, and page
              URLs into production-ready automation.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/generator"
                className="inline-flex min-w-[190px] items-center justify-center rounded-xl bg-black px-6 py-3 transition hover:opacity-90"
              >
                <span className="text-base font-medium text-white">Start Generating</span>
              </Link>

              <Link
                href="/pricing"
                className="inline-flex min-w-[130px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-800 transition hover:bg-gray-50"
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
                URL Analysis
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <div className="h-3 w-3 rounded-full bg-gray-300" />
            </div>

            <div className="rounded-2xl bg-black p-5 text-sm text-green-400">
              <pre className="whitespace-pre-wrap">{`test("user can log in", async ({ page }) => {
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

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-black">Prompt to Test</h2>
            <p className="text-gray-600">
              Describe a user flow in plain English and generate Playwright code
              instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-black">Component to Test</h2>
            <p className="text-gray-600">
              Paste React components or JSX and generate Playwright or unit test
              coverage faster.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-black">API and URL Workflows</h2>
            <p className="text-gray-600">
              Generate realistic API tests and use URLs to infer likely page flows
              and test scenarios.
            </p>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-black px-8 py-10 text-white">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-gray-300">
            Built for real teams
          </p>

          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            A simple UI with powerful automation output
          </h2>

          <p className="mt-4 max-w-3xl text-gray-300">
            PlaywrightGen is designed for developers, automation engineers, and
            SDETs who want cleaner selectors, faster test generation, and practical
            automation workflows without the noise of a bloated platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/generator"
              className="inline-flex min-w-[190px] items-center justify-center rounded-xl bg-white px-6 py-3 transition hover:bg-gray-100"
            >
              <span className="text-base font-medium text-black">Open Generator</span>
            </Link>

            <Link
              href="/pricing"
              className="inline-flex min-w-[150px] items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-gray-500">
              Coming soon
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
              AI-powered workflows that go beyond basic code generation
            </h2>

            <p className="mt-4 max-w-3xl text-gray-600">
              PlaywrightGen is evolving into a smarter automation platform with
              agent-style workflows, stronger context awareness, and test generation
              designed for real engineering teams.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold text-black">
                Agentic URL Analysis
              </h3>
              <p className="text-gray-600">
                Analyze a live page, infer the most likely user journey, and generate
                more realistic Playwright coverage automatically.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold text-black">
                Multi-Test Suite Generation
              </h3>
              <p className="text-gray-600">
                Create multiple related tests for login, validation, navigation,
                search, and critical flows from a single input.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold text-black">
                Component Intelligence
              </h3>
              <p className="text-gray-600">
                Paste a React component and generate Playwright tests, unit tests,
                and smarter selectors from the same source.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold text-black">
                AI Test Architecture Helpers
              </h3>
              <p className="text-gray-600">
                Generate reusable flows, page object ideas, and production-ready test
                structures for modern frontend projects.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}