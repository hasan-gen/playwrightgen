"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    const [remainingGenerations, setRemainingGenerations] = useState(5);
    const [isPro] = useState(false);

    const getTitle = () => {
        if (mode === "text") return "Describe your test";
        if (mode === "html") return "Paste HTML or JSX";
        if (mode === "component") {
            return outputType === "unit"
                ? "Paste a component for a unit test"
                : "Paste a component for a Playwright test";
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

    const handleGenerate = async () => {
        const today = new Date().toDateString();
        const usageKey = "playwrightgen_usage";
        const usageData = JSON.parse(localStorage.getItem(usageKey) || "{}");

        if (usageData.date !== today) {
            usageData.date = today;
            usageData.count = 0;
        }

        if (usageData.count >= 5) {
            setGeneratedCode(
                "Free limit reached (5 generations per day). Upgrade to Pro for unlimited generation."
            );
            return;
        }

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
                return;
            }

            setGeneratedCode(data.result);
            usageData.count += 1;
            localStorage.setItem(usageKey, JSON.stringify(usageData));
            updateRemainingGenerations();
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
                ? `Analyze the API behavior for this URL: ${url}. Generate a professional Playwright API test based on a likely authentication or data request scenario.`
                : mode === "html"
                    ? `Analyze this page URL: ${url}. Generate a professional Playwright test based on a likely HTML form or interactive UI flow on this page.`
                    : `Analyze this page URL: ${url}. Generate a professional Playwright UI test for the most likely user flow on this page. Include realistic interactions and assertions.`;

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
                return;
            }

            setGeneratedCode(data.result);
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

    const updateRemainingGenerations = () => {
        const today = new Date().toDateString();
        const usageKey = "playwrightgen_usage";
        const usageData = JSON.parse(localStorage.getItem(usageKey) || "{}");

        if (usageData.date !== today) {
            setRemainingGenerations(5);
            return;
        }

        const remaining = Math.max(0, 5 - (usageData.count || 0));
        setRemainingGenerations(remaining);
    };

    useEffect(() => {
        updateRemainingGenerations();
    }, []);

    return (
        <main className="min-h-screen px-6 py-10">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-black">
                            PlaywrightGen Generator
                        </h1>
                        <p className="mt-2 max-w-3xl text-gray-600">
                            Generate Playwright tests from prompts, components, HTML snippets,
                            APIs, or page URLs.
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                            Built for developers, automation engineers, and SDETs.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-gray-500">
                            Free plan: {remainingGenerations} of 5 generations left today
                        </span>
                      <Link
  href="/pricing"
  className="inline-flex items-center justify-center rounded-xl border border-black bg-white px-4 py-2 transition hover:bg-black"
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

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-black">{getTitle()}</h2>

                            {mode === "component" && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setOutputType("playwright")}
                                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${outputType === "playwright"
                                            ? "bg-black text-white"
                                            : "border border-gray-300 text-gray-700"
                                            }`}
                                    >
                                        Playwright Test
                                    </button>

                                    <button
                                        onClick={() => setOutputType("unit")}
                                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${outputType === "unit"
                                            ? "bg-black text-white"
                                            : "border border-gray-300 text-gray-700"
                                            }`}
                                    >
                                        Unit Test
                                    </button>
                                </div>
                            )}
                        </div>

                        {getTemplates().length > 0 && (
                            <div className="mb-5 flex flex-wrap gap-2">
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
                        )}

                        {(mode === "text" || mode === "html" || mode === "component") && (
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Page URL
                                </label>
                                <p className="mb-2 text-sm text-gray-500">
                                    Optional. Add a page URL to generate a more realistic browser test.
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

                        <textarea
                            className="min-h-[320px] w-full rounded-2xl border border-gray-300 bg-white p-4 outline-none transition focus:border-black"
                            placeholder={getPlaceholder()}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />

                        <div className="mt-5 flex flex-wrap gap-3">
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
                                Analyze URL {!isPro && "(Pro)"}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <p className="mb-1 text-sm text-gray-500">{getModeLabel()}</p>
                                <h2 className="text-xl font-semibold text-black">
                                    {getOutputTitle()}
                                </h2>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    disabled={!generatedCode}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {copied ? "Copied!" : "Copy Code"}
                                </button>

                                <button
                                    onClick={handleDownload}
                                    disabled={!generatedCode}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Download
                                </button>
                            </div>
                        </div>

                        {analysisSummary && (
                            <div className="mb-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                                {analysisSummary}
                            </div>
                        )}

                        <div className="min-h-[420px] rounded-2xl bg-black p-4 text-sm text-green-400">
                            <pre className="whitespace-pre-wrap">
                                {loading
                                    ? generationType === "url"
                                        ? "Analyzing URL and generating Playwright test..."
                                        : "Generating code..."
                                    : generatedCode || "Your generated output will appear here."}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}