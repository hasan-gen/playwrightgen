"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Mode = "text" | "html" | "api";

export default function GeneratorPage() {
    const [mode, setMode] = useState<Mode>("text");
    const [prompt, setPrompt] = useState("");
    const [generatedCode, setGeneratedCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [url, setUrl] = useState("");
    const [styleMode, setStyleMode] = useState("clean");
    const [generationType, setGenerationType] = useState<"prompt" | "url">("prompt");
    const [analysisSummary, setAnalysisSummary] = useState("");
    const [remainingGenerations, setRemainingGenerations] = useState(5);
    const [isPro] = useState(false);

    const getTitle = () => {
        if (mode === "text") return "Describe your test";
        if (mode === "html") return "Paste HTML or JSX";
        return "Describe your API test";
    };

    const getPlaceholder = () => {
        if (mode === "text") {
            return "Create a login test for a page with email and password. After successful login, the user should be redirected to /dashboard.";
        }

        if (mode === "html") {
            return `<input id="email" placeholder="Enter email" />
<input id="password" placeholder="Enter password" />
<button type="submit">Login</button>`;
        }

        return "Create a Playwright API test for POST /login with email and password. Expect status 200 and token in response.";
    };

    const getOutputTitle = () => {
        if (generationType === "url") {
            return "URL-Based Playwright Test";
        }

        if (mode === "text") return "Generated Playwright Test";
        if (mode === "html") return "Generated Playwright Test from HTML";
        return "Generated Playwright API Test";
    };
    const getModeLabel = () => {
        if (mode === "text") return "Text Mode";
        if (mode === "html") return "HTML Mode";
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
                "Free limit reached (5 tests per day). Upgrade to Pro for unlimited generation."
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

        const blob = new Blob([generatedCode], { type: "text/typescript" });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "playwright-test.spec.ts";
        link.click();

        window.URL.revokeObjectURL(url);
    };

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setPrompt("");
        setGeneratedCode("");
        setCopied(false);
        setUrl("");
        setGenerationType("prompt");
        setAnalysisSummary("");
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
        <main className="min-h-screen bg-white px-6 py-10">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-2 text-4xl font-bold tracking-tight">
                    AI Playwright Test Generator
                </h1>

                <p className="mb-2 text-gray-600">
                    Generate production-ready Playwright tests from plain English, HTML, or API descriptions.
                </p>
                <div className="mb-6 flex items-center gap-4 text-sm text-gray-500">
                    <p>
                        Free plan: {remainingGenerations} of 5 generations left today
                    </p>

                    <Link
                        href="/pricing"
                        className="rounded-lg border border-black px-3 py-1 text-sm font-medium hover:bg-black hover:text-white"
                    >
                        Upgrade to Pro
                    </Link>
                </div>

                <p className="mb-8 text-gray-500 text-sm">
                    Built for QA engineers, SDETs, and developers.
                </p>

                <div className="mb-6 flex gap-3">
                    <button
                        onClick={() => handleModeChange("text")}
                        className={`rounded-lg px-4 py-2 ${mode === "text"
                            ? "bg-black text-white"
                            : "border border-gray-300 text-gray-700"
                            }`}
                    >
                        Text
                    </button>

                    <button
                        onClick={() => handleModeChange("html")}
                        className={`rounded-lg px-4 py-2 ${mode === "html"
                            ? "bg-black text-white"
                            : "border border-gray-300 text-gray-700"
                            }`}
                    >
                        HTML
                    </button>

                    <button
                        onClick={() => handleModeChange("api")}
                        className={`rounded-lg px-4 py-2 ${mode === "api"
                            ? "bg-black text-white"
                            : "border border-gray-300 text-gray-700"
                            }`}
                    >
                        API
                    </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-5">
                        <h2 className="mb-3 text-xl font-semibold">{getTitle()}</h2>

                        {getTemplates().length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {getTemplates().map((template) => (
                                    <button
                                        key={template.label}
                                        onClick={() => handleTemplateSelect(template.value)}
                                        className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        {template.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Page URL
                            </label>
                            <p className="mb-2 text-sm text-gray-500">
                                Optional. Add a page URL to help generate a more realistic Playwright test.
                            </p>
                            <input
                                type="text"
                                placeholder="https://example.com/login"
                                className="w-full rounded-lg border border-gray-300 p-3 outline-none"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Code Style
                            </label>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStyleMode("fast")}
                                    className={`rounded-full px-3 py-1 text-sm ${styleMode === "fast"
                                        ? "bg-black text-white"
                                        : "border border-gray-300 text-gray-700"
                                        }`}
                                >
                                    Fast
                                </button>

                                <button
                                    onClick={() => setStyleMode("clean")}
                                    className={`rounded-full px-3 py-1 text-sm ${styleMode === "clean"
                                        ? "bg-black text-white"
                                        : "border border-gray-300 text-gray-700"
                                        }`}
                                >
                                    Clean
                                </button>

                                <button
                                    onClick={() => setStyleMode("senior-sdet")}
                                    className={`rounded-full px-3 py-1 text-sm ${styleMode === "senior-sdet"
                                        ? "bg-black text-white"
                                        : "border border-gray-300 text-gray-700"
                                        }`}
                                >
                                    Senior SDET
                                </button>
                            </div>
                        </div>
                        <textarea
                            className="min-h-[300px] w-full rounded-lg border border-gray-300 p-4 outline-none"
                            placeholder={getPlaceholder()}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="rounded-lg bg-black px-5 py-3 text-white hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Generating..." : "Generate Test"}
                            </button>

                            <button
                                onClick={handleAnalyzeUrl}
                                disabled={!url || loading}
                                className="rounded-lg border border-gray-300 px-5 py-3 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Analyze URL {!isPro && "(Pro)"}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5">
                        <div className="mb-3 flex items-start justify-between">
                            <div>
                                <p className="mb-1 text-sm text-gray-500">{getModeLabel()}</p>
                                <h2 className="text-xl font-semibold">{getOutputTitle()}</h2>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    disabled={!generatedCode}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {copied ? "Copied!" : "Copy Code"}
                                </button>

                                <button
                                    onClick={handleDownload}
                                    disabled={!generatedCode}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Download .ts
                                </button>
                            </div>
                        </div>
                        {analysisSummary && (
                            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                                {analysisSummary}
                            </div>
                        )}

                        <div className="min-h-[300px] rounded-lg bg-black p-4 text-sm text-green-400">
                            <pre className="whitespace-pre-wrap">
                                {loading
                                    ? generationType === "url"
                                        ? "Analyzing URL and generating Playwright test..."
                                        : "Generating Playwright test..."
                                    : generatedCode || "Your generated Playwright test will appear here."}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </main >
    );
}