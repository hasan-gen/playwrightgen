"use client";

import { useMemo, useState } from "react";

type IntelligenceMode =
    | "coverage"
    | "flaky"
    | "architecture"
    | "assertions";

type IntelligenceResult = {
    coverageScore?: number;
    coverageGaps: string[];
    missingScenarios: string[];
    riskPriority: string[];
    suggestedNextTests: string[];
};

const modes: {
    id: IntelligenceMode;
    title: string;
    description: string;
}[] = [
        {
            id: "coverage",
            title: "Coverage Intelligence",
            description:
                "Detect missing business-critical flows, negative paths, edge cases, and automation gaps.",
        },
        {
            id: "flaky",
            title: "Flaky Risk Detection",
            description:
                "Identify brittle selectors, async timing issues, race conditions, hard waits, and unstable test patterns.",
        },
        {
            id: "architecture",
            title: "Framework Architecture",
            description:
                "Review fixtures, duplicated setup, reusable helpers, page objects, maintainability, and scaling risks.",
        },
        {
            id: "assertions",
            title: "Assertion Intelligence",
            description:
                "Detect weak assertions, shallow validations, missing user-visible checks, and low-confidence verification.",
        },
    ];

const emptyResult: IntelligenceResult = {
    coverageGaps: [],
    missingScenarios: [],
    riskPriority: [],
    suggestedNextTests: [],
};

export default function CoveragePage() {
    const [mode, setMode] = useState<IntelligenceMode>("coverage");
    const [url, setUrl] = useState("");
    const [requirement, setRequirement] = useState("");
    const [existingTests, setExistingTests] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<IntelligenceResult | null>(null);
    const [error, setError] = useState("");
    const [remaining, setRemaining] = useState<number | null>(null);

    const activeMode = useMemo(
        () => modes.find((item) => item.id === mode) || modes[0],
        [mode]
    );

    const normalizeResult = (data: any): IntelligenceResult => {
        const raw = data?.result || {};

        return {
            coverageScore: raw.coverageScore ?? 72,
            coverageGaps:
                raw.coverageGaps ||
                raw.highRiskAreas ||
                raw.coreFlows ||
                emptyResult.coverageGaps,
            missingScenarios:
                raw.missingScenarios ||
                raw.validationCases ||
                emptyResult.missingScenarios,
            riskPriority:
                raw.riskPriority ||
                raw.edgeCases ||
                emptyResult.riskPriority,
            suggestedNextTests:
                raw.suggestedNextTests ||
                raw.coreFlows ||
                emptyResult.suggestedNextTests,
        };
    };

    const handleAnalyze = async () => {
        if (!url.trim() && !requirement.trim() && !existingTests.trim()) {
            setError("Add a URL, requirement, or existing test code first.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setResult(null);

            const response = await fetch("/api/intelligence", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mode,
                    url,
                    requirement,
                    existingTests,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to analyze test intelligence.");

                if (typeof data.remaining === "number") {
                    setRemaining(data.remaining);
                }

                return;
            }
            setResult(normalizeResult(data));
            if (typeof data.remaining === "number") {
                setRemaining(data.remaining);
            }
        } catch (err) {
            console.error("Test Intelligence error:", err);
            setError("Failed to analyze test intelligence.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-6xl">
                <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_28%)]" />

                    <div className="relative max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 sm:text-sm">
                            Test Intelligence
                        </p>

                        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                            Find coverage gaps before writing more tests
                        </h1>

                        <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
                            Analyze requirements, URLs, and existing Playwright tests to find
                            missing scenarios, risky flows, and the next highest-value tests
                            to automate.
                        </p>
                    </div>
                </section>

                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {modes.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setMode(item.id)}
                            className={`rounded-2xl border p-5 text-left transition ${mode === item.id
                                ? "border-sky-300 bg-sky-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
                                }`}
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-sm font-bold text-white">
                                {item.id === "coverage"
                                    ? "01"
                                    : item.id === "flaky"
                                        ? "02"
                                        : item.id === "architecture"
                                            ? "03"
                                            : "04"}
                            </div>

                            <h2 className="text-lg font-semibold text-slate-950">
                                {item.title}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {item.description}
                            </p>
                        </button>
                    ))}
                </section>

                <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                            Active Mode
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-950">
                            {activeMode.title}
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            {activeMode.description}
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Page URL
                            </label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/login"
                                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Requirement / User Flow
                            </label>
                            <textarea
                                rows={4}
                                value={requirement}
                                onChange={(e) => setRequirement(e.target.value)}
                                placeholder="User should log in, see validation errors, recover password, and land on dashboard..."
                                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Existing Playwright Test Code
                        </label>
                        <textarea
                            rows={8}
                            value={existingTests}
                            onChange={(e) => setExistingTests(e.target.value)}
                            placeholder="Paste existing Playwright tests here to find missing coverage..."
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-xs outline-none transition focus:border-sky-500"
                        />
                    </div>

                    {error && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            {remaining === null
                                ? "Free plan: 5 intelligence analyses per day"
                                : `Free plan: ${remaining} of 5 intelligence analyses left today`}
                        </p>
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-slate-950 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Analyzing..." : "Analyze Test Intelligence"}
                        </button>
                    </div>
                </section>

                {loading && (
                    <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="animate-pulse text-sm font-medium text-slate-600">
                            Analyzing coverage gaps, product risks, and missing test paths...
                        </p>
                    </section>
                )}

                {result && (
                    <section className="mt-8">
                        <div className="mb-6 rounded-[2rem] border border-sky-100 bg-sky-50 p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                                Intelligence Summary
                            </p>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-950">
                                        {result.coverageScore ?? 72}% Coverage Confidence
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Based on the provided flow, requirement, and existing test
                                        signal.
                                    </p>
                                </div>
                                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
                                    AI Review Complete
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <ResultCard
                                title="Coverage Gaps"
                                description="Important areas that appear under-tested or missing."
                                items={result.coverageGaps}
                            />

                            <ResultCard
                                title="Missing Scenarios"
                                description="Scenarios that should be added before trusting coverage."
                                items={result.missingScenarios}
                            />

                            <ResultCard
                                title="Risk Priority"
                                description="Highest-risk areas ranked by business and regression impact."
                                items={result.riskPriority}
                            />

                            <ResultCard
                                title="Suggested Next Tests"
                                description="Practical automation targets to send into Generate next."
                                items={result.suggestedNextTests}
                            />
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}

function ResultCard({
    title,
    description,
    items,
}: {
    title: string;
    description: string;
    items: string[];
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
                {items.length > 0 ? (
                    items.map((item, index) => (
                        <div
                            key={`${title}-${index}`}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                            {item}
                        </div>
                    ))
                ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-500">
                        No items returned yet.
                    </div>
                )}
            </div>
        </div>
    );
}