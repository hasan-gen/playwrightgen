import Link from "next/link";

const coreFeatures = [
  {
    title: "Figma → Code",
    description:
      "Turn screenshots and design references into developer-ready Angular, React, HTML, or Playwright output with clean multi-file structure.",
    icon: (
      <div className="relative h-12 w-12">
        <div className="absolute left-1 top-1 h-8 w-8 rounded-xl border border-sky-300 bg-white shadow-sm" />
        <div className="absolute left-4 top-4 h-8 w-8 rounded-xl border border-sky-400 bg-sky-50 shadow-sm" />
        <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400 text-[10px] font-bold text-white">
          {"</>"}
        </div>
      </div>
    ),
  },
  {
    title: "Debug Assistant",
    description:
      "Analyze test failures, UI issues, and flaky flows with root-cause guidance, safer fixes, and production-minded debugging output.",
    icon: (
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50">
        <div className="absolute h-5 w-5 rounded-full border-2 border-sky-500" />
        <div className="absolute right-2 top-7 h-2.5 w-2.5 rotate-45 rounded-sm bg-sky-500" />
        <div className="absolute left-5 top-4 h-1.5 w-1.5 rounded-full bg-sky-500" />
      </div>
    ),
  },
  {
    title: "AI Mode",
    description:
      "Switch between standard output and enhanced reasoning for deeper coverage, stronger engineering suggestions, and smarter generation.",
    icon: (
      <div className="relative h-12 w-12 rounded-2xl border border-sky-200 bg-sky-50 p-2">
        <div className="absolute left-2 top-5 h-3 w-8 rounded-full bg-sky-200" />
        <div className="absolute left-6 top-[1.05rem] h-5 w-5 rounded-full bg-sky-500 shadow-sm" />
        <div className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-500">
          AI
        </div>
      </div>
    ),
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Choose a workflow",
    description: "Generate tests, debug failures, or turn Figma into structured code.",
  },
  {
    step: "02",
    title: "Add your input",
    description: "Use prompts, components, screenshots, URLs, or uploaded files.",
  },
  {
    step: "03",
    title: "Get structured output",
    description: "Receive tests, fixes, multi-file code, and developer-ready results.",
  },
];

const whatsNext = [
  "Agentic AI workflows that can plan, generate, and refine automation across multiple steps",
  "Deeper design-to-code intelligence inspired by next-generation AI assistants like Claude-style reasoning",
  "Project-level memory for reusable test patterns, component history, and smarter long-term generation",
];

const whyPlaywrightGen = [
  {
    title: "Real multi-file output",
    description:
      "Output looks closer to real project files, not just one giant AI response block.",
  },
  {
    title: "Structured debugging",
    description:
      "Debug output is designed to identify root cause, safer fixes, and what to test next.",
  },
  {
    title: "Built for real engineering work",
    description:
      "Made for developers, automation engineers, and SDETs who care about usable output.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-7 sm:py-4 lg:px-8 lg:py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_left_center,rgba(56,189,248,0.10),transparent_24%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200">
                  AI Powered
                </span>

                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs text-gray-500">
                  Live AI workflows enabled
                </span>
              </div>

              <h1 className="max-w-3xl -mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.05]">
                AI workflows for testing, debugging, and{" "}
                <span className="text-sky-500">Figma-to-code</span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Generate production-ready Playwright tests, debug real failures,
                and convert UI designs into developer-ready code from one workspace.
              </p>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  href="/login?next=/generator"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-950 px-6 py-3 text-base font-medium text-white transition hover:opacity-90 sm:min-w-[190px] sm:w-auto"
                >
                  Start Free ⚡
                </Link>

                <Link
                  href="/pricing"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-6 py-3 text-base font-medium text-sky-700 transition hover:bg-sky-100 sm:min-w-[150px] sm:w-auto"
                >
                  View Pricing $
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center font-medium text-slate-700">
                  Prompt → Test
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center font-medium text-slate-700">
                  Figma → Multi-file
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center font-medium text-slate-700">
                  Debug → Root Cause
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center font-medium text-slate-700">
                  Free Plan: 5/day
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-sm">
                <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-6 py-5 shadow-sm">
                  <div className="relative h-28">
                    {/* 主流程线 */}
                    <div className="absolute left-[14%] right-[14%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-sky-200 via-blue-200 to-sky-200"></div>

                    {/* 发光扫线 */}
                    <div
                      className="absolute left-[14%] top-1/2 h-10 w-20 -translate-y-1/2 rounded-full bg-sky-200/40 blur-xl"
                      style={{ animation: "pipelineScan 4s linear infinite" }}
                    ></div>

                    {/* 左：人 */}
                    <div className="absolute left-[4%] top-1/2 -translate-y-1/2">
                      <div className="relative h-20 w-20 rounded-full border border-slate-200 bg-white shadow-sm">
                        <div className="absolute left-1/2 top-[1.15rem] h-5 w-5 -translate-x-1/2 rounded-full bg-slate-400"></div>
                        <div className="absolute left-1/2 top-[2.65rem] h-8 w-10 -translate-x-1/2 rounded-t-[999px] bg-slate-300"></div>
                        <div className="absolute inset-0 rounded-full border border-sky-100"></div>
                      </div>
                    </div>

                    {/* 中：AI Core */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-sm">
                        <div className="absolute h-14 w-14 rounded-full bg-sky-200/50 blur-xl animate-pulse"></div>
                        <div className="absolute h-10 w-10 rounded-2xl border border-sky-300 bg-sky-100"></div>
                        <div className="absolute h-4 w-4 rounded-full bg-sky-500 shadow-[0_0_16px_rgba(14,165,233,0.65)] animate-pulse"></div>

                        <div className="absolute h-16 w-16 rounded-full border border-sky-200/70"></div>
                        <div className="absolute h-20 w-20 rounded-full border border-sky-100/70"></div>

                        <div className="absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-sky-300 animate-pulse"></div>
                        <div className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-sky-300 animate-pulse"></div>
                        <div className="absolute left-1/2 -top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-sky-300 animate-pulse"></div>
                        <div className="absolute left-1/2 -bottom-2 h-3 w-3 -translate-x-1/2 rounded-full bg-sky-300 animate-pulse"></div>
                      </div>
                    </div>

                    {/* 右：电脑 */}
                    <div className="absolute right-[4%] top-1/2 -translate-y-1/2">
                      <div className="relative h-20 w-24 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="absolute left-1/2 top-3 h-10 w-16 -translate-x-1/2 rounded-lg border border-sky-100 bg-slate-50"></div>
                        <div className="absolute left-1/2 top-[4.15rem] h-3 w-3 -translate-x-1/2 rounded-sm bg-slate-300"></div>
                        <div className="absolute left-1/2 top-[4.9rem] h-1.5 w-10 -translate-x-1/2 rounded-full bg-slate-300"></div>

                        <div className="absolute left-1/2 top-6 h-1 w-10 -translate-x-1/2 rounded-full bg-sky-200"></div>
                        <div className="absolute left-1/2 top-[2.15rem] h-1 w-8 -translate-x-1/2 rounded-full bg-sky-300"></div>
                      </div>
                    </div>

                    {/* 流动粒子 1 */}
                    <div
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.65)]"
                      style={{ animation: "pipelineFlow 3.2s linear infinite" }}
                    ></div>

                    {/* 流动粒子 2 */}
                    <div
                      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_16px_rgba(14,165,233,0.7)]"
                      style={{ animation: "pipelineFlow 3.2s linear infinite", animationDelay: "1.1s" }}
                    ></div>

                    {/* 流动粒子 3 */}
                    <div
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.55)]"
                      style={{ animation: "pipelineFlow 3.2s linear infinite", animationDelay: "2.1s" }}
                    ></div>

                    {/* 微粒装饰 */}
                    <div className="absolute left-[22%] top-[28%] h-1.5 w-1.5 rounded-full bg-sky-200"></div>
                    <div className="absolute left-[40%] top-[72%] h-1.5 w-1.5 rounded-full bg-slate-200"></div>
                    <div className="absolute left-[63%] top-[26%] h-1.5 w-1.5 rounded-full bg-sky-200"></div>
                    <div className="absolute left-[79%] top-[70%] h-1.5 w-1.5 rounded-full bg-slate-200"></div>
                  </div>
                </div>

              </div>

            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-500" />
                  <div className="h-3 w-3 rounded-full bg-slate-500" />
                  <div className="h-3 w-3 rounded-full bg-slate-500" />
                </div>
                <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-sky-300">
                  Live Preview
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-medium text-white">
                    Component.tsx
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-slate-300">
                    Component.css
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-slate-300">
                    Component.test.tsx
                  </span>
                </div>

                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200 sm:text-sm">{`export function LoginCard() {
return (
<section className="login-card">
<h1>Welcome back</h1>
<p>Sign in to continue your workflow.</p>

<form>
<input type="email" placeholder="Enter email" />
<input type="password" placeholder="Enter password" />
<button type="submit">Sign in</button>
</form>
</section>
);
}`}</pre>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
                    Figma
                  </div>
                  <p className="text-sm text-slate-300">
                    Multi-file output for Angular, React, and HTML/CSS.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
                    Debug
                  </div>
                  <p className="text-sm text-slate-300">
                    Root cause, safer fixes, and what to test next.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
                    AI Mode
                  </div>
                  <p className="text-sm text-slate-300">
                    Switch between fast output and enhanced reasoning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="mt-4">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 sm:text-sm">
              Core workflows
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Three workflows built for real engineering work
            </h2>

            <p className="mt-3 max-w-3xl text-slate-600">
              PlaywrightGen is strongest when it helps you move faster without
              losing structure, readability, or developer trust.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {coreFeatures.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-5 flex items-center justify-between">
                  {item.icon}
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400/10 to-sky-500/5" />
                </div>

                <h3 className="mb-3 text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="leading-7 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 sm:text-sm">
              How it works
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              One workspace. Three simple steps.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="leading-7 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What's next */}
        <section className="mt-16">
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 sm:text-sm">
              What’s next
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              The next upgrades already in motion
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {whatsNext.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 h-2 w-12 rounded-full bg-sky-400" />
                <p className="leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why PlaywrightGen */}
        <section className="mt-16 rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-sky-300 sm:text-sm">
            Why PlaywrightGen
          </p>

          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Built to feel more like a developer tool than a generic AI demo
          </h2>

          <p className="mt-4 max-w-3xl text-slate-300">
            The goal is not just to generate output. The goal is to generate
            output that engineers can actually work with.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {whyPlaywrightGen.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-4 h-2 w-14 rounded-full bg-sky-400" />
                <h3 className="mb-3 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/login?next=/generator"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-medium text-slate-950 transition hover:bg-slate-100 sm:min-w-[210px] sm:w-auto"
            >
              Start Generating ⚡
            </Link>

            <Link
              href="/pricing"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-sky-300/30 bg-sky-400/10 px-6 py-3 text-base font-medium text-sky-200 transition hover:bg-sky-400/20 sm:min-w-[165px] sm:w-auto"
            >
              View Pricing $$
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            Start with the free plan. Upgrade when you need more advanced AI workflows.
          </p>
        </section>
      </div>
    </main>
  );
}