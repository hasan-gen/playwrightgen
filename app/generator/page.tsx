"use client";

import Link from "next/link";
import { useState } from "react";

type Mode = "text" | "html" | "api" | "component";
type StyleMode = "fast" | "clean" | "production";
type OutputType = "playwright" | "unit";

export default function GeneratorPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [styleMode, setStyleMode] = useState<StyleMode>("clean");
  const [outputType, setOutputType] = useState<OutputType>("playwright");
  const [generationType, setGenerationType] = useState<"prompt" | "url">("prompt");
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [remainingGenerations, setRemainingGenerations] = useState<number>(5);
  const [hasSyncedUsage, setHasSyncedUsage] = useState(false);
  const [isPro] = useState(false);
  const [selectedCoverage, setSelectedCoverage] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);

  const getTitle = () => {
    if (mode === "text") return "Describe your test";
    if (mode === "html") return "Paste HTML or JSX";
    if (mode === "component") {
      return "Component → Test";
    }
    return "Describe your API test";
  };

  const getPlaceholder = () => {
    if (mode === "text") {
      return "Create a login test for a page with email and password. After successful login, the user should be redirected to /dashboard.";
    }

    if (mode === "html") {
      return `<form>
  <input placeholder="Enter email" />
  <input placeholder="Enter password" type="password" />
  <button type="submit">Login</button>
</form>`;
    }

    if (mode === "component") {
      return outputType === "unit"
        ? `export function LoginForm() {
  return (
    <form>
      <label htmlFor="email">Email</label>
      <input id="email" placeholder="Enter email" />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" placeholder="Enter password" />
      <button type="submit">Login</button>
    </form>
  );
}`
        : `export function LoginForm() {
  return (
    <form>
      <input placeholder="Enter email" />
      <input placeholder="Enter password" type="password" />
      <button type="submit">Login</button>
    </form>
  );
}`;
    }

    return "Create a Playwright API test for POST /login with email and password. Expect status 200 and a token in response.";
  };

  const getOutputTitle = () => {
    if (generationType === "url") {
      return "URL-Based Playwright Test";
    }

    if (mode === "component" && outputType === "unit") {
      return "Generated Component Unit Test";
    }

    if (mode === "component") {
      return "Generated Component Playwright Test";
    }

    if (mode === "text") return "Generated Playwright Test";
    if (mode === "html") return "Generated Playwright Test from HTML";
    return "Generated Playwright API Test";
  };

  const getModeLabel = () => {
    if (mode === "text") return "Prompt Mode";
    if (mode === "html") return "HTML Mode";
    if (mode === "component") {
      return outputType === "unit" ? "Component Unit Test Mode" : "Component Mode";
    }
    return "API Mode";
  };

  const appendCoverageSuggestion = (suggestion: string) => {
    setPrompt((prev) => {
      const trimmedPrev = prev.trim();

      if (trimmedPrev.includes(suggestion)) {
        return prev;
      }

      if (!trimmedPrev) {
        return suggestion;
      }

      return `${trimmedPrev}\n${suggestion}`;
    });

    setSelectedCoverage((prev) =>
      prev.includes(suggestion) ? prev : [...prev, suggestion]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setGeneratedCode("Please enter a prompt first.");
      return;
    }

    try {
      setGenerationType("prompt");
      setAnalysisSummary("");
      setLoading(true);
      setCopied(false);
      setGeneratedCode("");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          prompt,
          url,
          styleMode,
          outputType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGeneratedCode(data.error || "Something went wrong.");

        if (typeof data.remaining === "number") {
          setRemainingGenerations(data.remaining);
          setHasSyncedUsage(true);
        }

        return;
      }

      setGeneratedCode(data.result);

      if (typeof data.remaining === "number") {
        setRemainingGenerations(data.remaining);
        setHasSyncedUsage(true);
      }
    } catch (error) {
      console.error("Generate error:", error);
      setGeneratedCode("Failed to generate code.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!isPro) {
      setGeneratedCode(
        "URL analysis is a Pro feature. Upgrade to Pro to analyze real pages and generate full Playwright tests."
      );
      return;
    }

    if (!url.trim()) {
      setGeneratedCode("Please enter a URL first.");
      return;
    }

    const analysisPrompt =
      mode === "api"
        ? `Analyze the API behavior for this URL: ${url}.

Generate a small Playwright API test suite in TypeScript.

Requirements:
- Generate 3 to 4 realistic API tests
- Group them inside test.describe(...)
- Cover success, validation, and edge-case scenarios
- Include assertions on status and response body
- Write the tests like a senior API automation engineer

Return only valid Playwright TypeScript code.`
        : `Analyze this page URL: ${url}.

Generate a realistic Playwright test suite in TypeScript.

Requirements:
- Think like a senior test architect before writing the code
- Infer the most valuable scenarios from the page structure first
- Prioritize coverage of primary flows, validation flows, and edge cases before implementation details
- Generate 3 to 5 related tests
- Group them inside test.describe(...)
- Focus on the most likely user flows
- Include positive and negative scenarios
- Use stable selectors like getByRole, getByLabel, getByPlaceholder when possible
- Include meaningful expect() assertions
- Write tests like a senior automation engineer for a production repository

Return only valid Playwright TypeScript code.`;

    setAnalysisSummary(`Analyzed URL: ${url}`);
    setPrompt(analysisPrompt);

    try {
      setGenerationType("url");
      setLoading(true);
      setCopied(false);
      setGeneratedCode("");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          prompt: analysisPrompt,
          url,
          styleMode,
          outputType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGeneratedCode(data.error || "Something went wrong.");

        if (typeof data.remaining === "number") {
          setRemainingGenerations(data.remaining);
          setHasSyncedUsage(true);
        }

        return;
      }

      setGeneratedCode(data.result);

      if (typeof data.remaining === "number") {
        setRemainingGenerations(data.remaining);
        setHasSyncedUsage(true);
      }
    } catch (error) {
      console.error("Analyze URL error:", error);
      setGeneratedCode("Failed to analyze URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;

    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleExplain = async () => {
    if (!generatedCode) return;

    try {
      setExplaining(true);
      setExplanation("");

      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: generatedCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setExplanation(data.error || "Failed to explain test.");
        return;
      }

      setExplanation(data.explanation || "No explanation returned.");
    } catch (error) {
      console.error("Explain error:", error);
      setExplanation("Failed to explain test.");
    } finally {
      setExplaining(false);
    }
  };

  const handleDownload = () => {
    if (!generatedCode) return;

    const extension = outputType === "unit" ? "test.tsx" : "spec.ts";
    const blob = new Blob([generatedCode], { type: "text/typescript" });
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `playwrightgen-output.${extension}`;
    link.click();

    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setPrompt("");
    setGeneratedCode("");
    setCopied(false);
    setUrl("");
    setGenerationType("prompt");
    setAnalysisSummary("");
    setSelectedCoverage([]);
    setExplanation("");

    if (newMode !== "component") {
      setOutputType("playwright");
    }
  };

  const handleTemplateSelect = (template: string) => {
    setPrompt(template);
    setGeneratedCode("");
    setCopied(false);
  };

  const getTemplates = () => {
    if (mode === "text") {
      return [
        {
          label: "Login Test",
          value:
            "Create a login test for a page with email and password. After successful login, the user should be redirected to /dashboard.",
        },
        {
          label: "Signup Test",
          value:
            "Create a signup test for a page with name, email, password, and confirm password. After successful signup, the user should see a welcome message.",
        },
        {
          label: "Search Test",
          value:
            "Create a search test where the user types a product name into a search input, clicks search, and sees matching results.",
        },
      ];
    }

    if (mode === "api") {
      return [
        {
          label: "API Auth Test",
          value:
            "Create a Playwright API test for POST /login with email and password. Expect status 200 and token in response.",
        },
        {
          label: "Get Profile Test",
          value:
            "Create a Playwright API test for GET /users/profile. Expect status 200 and a user object in the response.",
        },
      ];
    }

    if (mode === "component") {
      return outputType === "unit"
        ? [
          {
            label: "Form Unit Test",
            value: `export function LoginForm() {
  return (
    <form>
      <label htmlFor="email">Email</label>
      <input id="email" placeholder="Enter email" />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" placeholder="Enter password" />
      <button type="submit">Login</button>
    </form>
  );
}`,
          },
          {
            label: "Modal Unit Test",
            value: `export function DeleteModal() {
  return (
    <div>
      <h2>Delete item</h2>
      <button>Cancel</button>
      <button>Confirm Delete</button>
    </div>
  );
}`,
          },
        ]
        : [
          {
            label: "Login Component",
            value: `export function LoginForm() {
  return (
    <form>
      <input placeholder="Enter email" />
      <input type="password" placeholder="Enter password" />
      <button type="submit">Login</button>
    </form>
  );
}`,
          },
          {
            label: "Search Component",
            value: `export function SearchBar() {
  return (
    <div>
      <input placeholder="Search products" />
      <button>Search</button>
    </div>
  );
}`,
          },
        ];
    }

    return [];
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              PlaywrightGen Generator
            </h1>
            <p className="mt-2 max-w-3xl text-gray-600">
              Generate, analyze, and improve Playwright test coverage from prompts,
              components, HTML snippets, APIs, and page URLs.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Built for developers, automation engineers, and SDETs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <span className="text-sm text-gray-500">
              {hasSyncedUsage
                ? `Free plan: ${remainingGenerations} of 5 generations left today`
                : "Free plan: 5 generations per day"}
            </span>

            <Link
              href="/pricing"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-black bg-white px-4 py-2 transition hover:bg-black"
            >
              <span className="text-sm font-medium text-black [a:hover_&]:text-white">
                Upgrade to Pro
              </span>
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => handleModeChange("text")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === "text"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-700"
              }`}
          >
            Prompt
          </button>

          <button
            onClick={() => handleModeChange("component")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === "component"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-700"
              }`}
          >
            Component
          </button>

          <button
            onClick={() => handleModeChange("html")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === "html"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-700"
              }`}
          >
            HTML
          </button>

          <button
            onClick={() => handleModeChange("api")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === "api"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-700"
              }`}
          >
            API
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-black">{getTitle()}</h2>
              </div>

              {mode === "component" && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Test Type</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setOutputType("playwright")}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${outputType === "playwright"
                        ? "bg-black text-white"
                        : "border border-gray-300 bg-white text-gray-700"
                        }`}
                    >
                      Playwright Test
                    </button>

                    <button
                      onClick={() => setOutputType("unit")}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${outputType === "unit"
                        ? "bg-black text-white"
                        : "border border-gray-300 bg-white text-gray-700"
                        }`}
                    >
                      Unit Test
                    </button>
                  </div>
                </div>
              )}
            </div>

            {getTemplates().length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {mode === "component"
                    ? "Example Components"
                    : mode === "html"
                      ? "Example Markup"
                      : mode === "api"
                        ? "Example Requests"
                        : "Example Tests"}
                </p>

                <div className="flex flex-wrap gap-2">
                  {getTemplates().map((template) => (
                    <button
                      key={template.label}
                      onClick={() => handleTemplateSelect(template.value)}
                      className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(mode === "text" || mode === "html" || mode === "component") && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Page URL
                </label>
                <p className="mb-2 text-sm text-gray-500">
                  Optional. Add a page URL to analyze page structure and generate a more realistic Playwright test suite.
                </p>
                <input
                  type="text"
                  placeholder="https://example.com/login"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none transition focus:border-black"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Code Style
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStyleMode("fast")}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${styleMode === "fast"
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-gray-700"
                    }`}
                >
                  Fast
                </button>

                <button
                  onClick={() => setStyleMode("clean")}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${styleMode === "clean"
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-gray-700"
                    }`}
                >
                  Clean
                </button>

                <button
                  onClick={() => setStyleMode("production")}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${styleMode === "production"
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-gray-700"
                    }`}
                >
                  Production
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-sm font-semibold text-gray-800">
                Suggested Test Coverage
              </p>

              <p className="mb-3 text-xs text-gray-500">
                AI-prioritized coverage areas for this input mode.
              </p>

              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                {mode === "text" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a happy path scenario for the main user flow.")
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition ${selectedCoverage.includes("Include a happy path scenario for the main user flow.")
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      Happy path
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a negative scenario that validates incorrect or failed user behavior.")
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition ${selectedCoverage.includes("Include a negative scenario that validates incorrect or failed user behavior.")
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      Negative scenario
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a validation flow scenario for missing, invalid, or blocked input.")
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition ${selectedCoverage.includes("Include a validation flow scenario for missing, invalid, or blocked input.")
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      Validation flow
                    </button>
                  </>
                )}

                {mode === "html" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Cover the main user flow suggested by the provided markup.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Main user flow
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include validation behavior for the provided markup.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Validation behavior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a negative case based on the provided HTML or JSX.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Negative case
                    </button>
                  </>
                )}

                {mode === "component" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Cover the initial render state of the component.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Render state
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a user interaction scenario for the component.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      User interaction
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a scenario that verifies state or UI updates after interaction.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      State update
                    </button>
                  </>
                )}

                {mode === "api" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include a successful response scenario for the API.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Success response
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include an invalid request scenario for the API.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Invalid request
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendCoverageSuggestion("Include an edge case scenario for the API.")
                      }
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
                    >
                      Edge case
                    </button>
                  </>
                )}
              </div>
            </div>

            <textarea
              className="min-h-[300px] w-full rounded-2xl border border-gray-300 bg-white p-4 font-mono text-sm outline-none transition focus:border-black sm:min-h-[340px]"
              placeholder={getPlaceholder()}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate"}
              </button>

              <button
                onClick={handleAnalyzeUrl}
                disabled={!url || loading}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Analyze Page {!isPro && "(Pro)"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 lg:max-w-[52%]">
                <p className="mb-1 text-sm text-gray-500">{getModeLabel()}</p>
                <h2 className="text-xl font-semibold leading-snug text-black">
                  {getOutputTitle()}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <button
                  onClick={handleCopy}
                  disabled={!generatedCode}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? "Copied!" : "Copy Code"}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!generatedCode}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  onClick={handleExplain}
                  disabled={!generatedCode || explaining}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {explaining ? "Explaining..." : "Explain Test"}
                </button>
              </div>
            </div>

            {analysisSummary && (
              <div className="mb-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                {analysisSummary}
              </div>
            )}

            <div className="min-h-[360px] overflow-x-auto rounded-2xl bg-black p-5 text-sm text-green-400 sm:min-h-[420px]">
              <pre className="min-w-[260px] whitespace-pre-wrap">
                {loading
                  ? generationType === "url"
                    ? "Analyzing page structure and generating Playwright test suite..."
                    : "Generating code..."
                  : generatedCode || "Your generated output will appear here."}
              </pre>
            </div>
            {explanation && (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">Test Explanation</p>
                <p>{explanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}