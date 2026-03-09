import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
            AI for QA, SDET, and Developers
          </p>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-black">
            Generate Playwright tests with AI
          </h1>

          <p className="mb-4 text-xl text-gray-700">
            Build production-ready Playwright tests from plain English, HTML, API descriptions, or a page URL.
          </p>

          <p className="mb-10 text-base text-gray-500">
            PlaywrightGen helps QA engineers, SDETs, and developers create faster, cleaner, and more reliable test automation.
          </p>

          <div className="mb-14 flex flex-wrap gap-4">
            <Link
              href="/generator"
              className="rounded-lg bg-black px-6 py-3 text-lg text-white transition hover:opacity-80"
            >
              Try PlaywrightGen
            </Link>

            <Link
              href="/generator"
              className="rounded-lg border border-gray-300 px-6 py-3 text-lg text-gray-700 transition hover:bg-gray-50"
            >
              View Demo
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 p-6">
            <h2 className="mb-3 text-xl font-semibold">Plain English to Test</h2>
            <p className="text-gray-600">
              Describe a user flow in natural language and generate Playwright test code instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6">
            <h2 className="mb-3 text-xl font-semibold">HTML to Locator</h2>
            <p className="text-gray-600">
              Paste HTML or JSX and generate more stable Playwright selectors and realistic user interactions.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6">
            <h2 className="mb-3 text-xl font-semibold">URL-Based Test Generation</h2>
            <p className="text-gray-600">
              Add a page URL and generate more realistic Playwright tests for likely user flows and page behavior.
            </p>
          </div>
        </div>
        <div className="mt-16 rounded-2xl border border-gray-200 p-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Why PlaywrightGen
          </p>

          <h2 className="mb-4 text-3xl font-bold tracking-tight text-black">
            Built for real automation workflows
          </h2>

          <p className="mb-8 max-w-3xl text-gray-600">
            Unlike generic AI coding tools, PlaywrightGen is designed specifically for QA engineers,
            SDETs, and developers who need production-ready Playwright tests, stronger selectors,
            and more practical automation output.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-2 text-lg font-semibold">Better selectors</h3>
              <p className="text-gray-600">
                Prioritizes accessible and more stable Playwright selectors like getByRole,
                getByLabel, and getByPlaceholder.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">Faster test creation</h3>
              <p className="text-gray-600">
                Generate test cases from plain English, HTML, API descriptions, or page URLs in seconds.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">Built for engineers</h3>
              <p className="text-gray-600">
                Designed for practical use by QA leads, senior SDETs, developers, and engineering teams.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-16 rounded-2xl bg-black px-8 py-10 text-white">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-300">
            Start building faster
          </p>

          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Generate smarter Playwright tests in minutes
          </h2>

          <p className="mb-8 max-w-2xl text-gray-300">
            Use AI to create cleaner, faster, and more practical Playwright tests for modern QA and engineering teams.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/generator"
              className="rounded-lg bg-white px-6 py-3 text-lg font-medium text-black transition hover:opacity-90"
            >
              Open Generator
            </Link>

            <Link
              href="/generator"
              className="rounded-lg border border-white/30 px-6 py-3 text-lg text-white transition hover:bg-white/10"
            >
              Try a Demo
            </Link>
          </div>
        </div>
        <div className="mt-16">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Use Cases
          </p>

          <h2 className="mb-4 text-3xl font-bold tracking-tight text-black">
            Built for modern test automation teams
          </h2>

          <p className="mb-8 max-w-3xl text-gray-600">
            PlaywrightGen helps engineering teams generate tests faster, improve selector quality,
            and reduce the time spent writing repetitive automation code.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">QA Engineers</h3>
              <p className="text-gray-600">
                Turn manual test ideas into automated Playwright coverage faster.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">Senior SDETs</h3>
              <p className="text-gray-600">
                Generate more stable locators, reusable flows, and production-ready test code.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">Developers & Leads</h3>
              <p className="text-gray-600">
                Prototype automation quickly from HTML, APIs, and page URLs without starting from scratch.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-16 rounded-2xl border border-dashed border-gray-300 p-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Coming Soon
          </p>

          <h2 className="mb-4 text-3xl font-bold tracking-tight text-black">
            The future of AI-powered test automation
          </h2>

          <p className="mb-8 max-w-3xl text-gray-600">
            PlaywrightGen is evolving into a full AI automation platform for modern
            engineering teams. These capabilities are currently in development.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">DOM AI Analysis</h3>
              <p className="text-gray-600">
                Automatically analyze full page DOM structures and generate complete
                Playwright test flows.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">Test Suite Generator</h3>
              <p className="text-gray-600">
                Generate multiple related Playwright tests for full user journeys.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">Page Object Generator</h3>
              <p className="text-gray-600">
                Automatically generate maintainable Page Object Models from UI
                structures.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="mb-2 text-lg font-semibold">GitHub Repo Analyzer</h3>
              <p className="text-gray-600">
                Analyze existing repositories and suggest missing Playwright tests.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}