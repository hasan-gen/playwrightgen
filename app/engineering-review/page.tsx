"use client";

import { useMemo, useState } from "react";

type ReviewFocus =
    | "architecture"
    | "testing"
    | "security"
    | "performance"
    | "maintainability"
    | "production";

type ReviewDepth = "standard" | "deep" | "architect";

type Severity = "Critical" | "High" | "Medium" | "Low";

type Finding = {
    title: string;
    severity: Severity;
    impact: string;
    evidence: string;
    recommendation: string;
};

type Score = {
    label: string;
    score: number;
    grade: string;
};

type EngineeringReviewResult = {
    overallScore: number;
    executiveSummary: string;
    scores: Score[];
    productionReadiness: {
        status: "Ready" | "Partially Ready" | "Not Ready";
        reason: string;
    };
    criticalFindings: Finding[];
    architectureIntelligence: Finding[];
    testIntelligence: Finding[];
    securityIntelligence: Finding[];
    performanceIntelligence: Finding[];
    maintainabilityIntelligence: Finding[];
    recommendedActions: Finding[];
};

const reviewFocusOptions: {
    id: ReviewFocus;
    title: string;
    description: string;
}[] = [
        {
            id: "architecture",
            title: "Architecture",
            description: "Review structure, coupling, boundaries, scalability, and ownership.",
        },
        {
            id: "testing",
            title: "Testing",
            description: "Review coverage, flaky risks, assertions, E2E quality, and gaps.",
        },
        {
            id: "security",
            title: "Security",
            description: "Review secrets, unsafe patterns, exposure risks, and auth boundaries.",
        },
        {
            id: "performance",
            title: "Performance",
            description: "Review rendering, async behavior, caching, loading, and bottlenecks.",
        },
        {
            id: "maintainability",
            title: "Maintainability",
            description: "Review duplication, complexity, technical debt, and refactor risks.",
        },
        {
            id: "production",
            title: "Production Readiness",
            description: "Review release confidence, observability, regression risk, and stability.",
        },
    ];

const depthOptions: {
    id: ReviewDepth;
    title: string;
    description: string;
}[] = [
        {
            id: "standard",
            title: "Standard Review",
            description: "Balanced engineering review for everyday project analysis.",
        },
        {
            id: "deep",
            title: "Deep Review",
            description: "More detailed risk, architecture, testing, and maintainability analysis.",
        },
        {
            id: "architect",
            title: "Architect Mode",
            description: "Staff/Principal-level review focused on long-term engineering decisions.",
        },
    ];

export default function EngineeringReviewPage() {
    const [projectName, setProjectName] = useState("");
    const [repositoryUrl, setRepositoryUrl] = useState("");
    const [projectSummary, setProjectSummary] = useState("");
    const [sourceBundle, setSourceBundle] = useState("");
    const [selectedFocus, setSelectedFocus] = useState<ReviewFocus[]>([
        "architecture",
        "testing",
        "maintainability",
        "production",
    ]);
    const [depth, setDepth] = useState<ReviewDepth>("deep");
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [result, setResult] = useState<EngineeringReviewResult | null>(null);

    const selectedFocusText = useMemo(
        () =>
            reviewFocusOptions
                .filter((item) => selectedFocus.includes(item.id))
                .map((item) => item.title)
                .join(", "),
        [selectedFocus]
    );

    const toggleFocus = (focus: ReviewFocus) => {
        setSelectedFocus((prev) =>
            prev.includes(focus)
                ? prev.filter((item) => item !== focus)
                : [...prev, focus]
        );
        setResult(null);
        setError("");
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const selected = Array.from(files);
        const maxFileSize = 250_000;
        const maxTotalSize = 600_000;

        const totalSize = selected.reduce((sum, file) => sum + file.size, 0);

        if (totalSize > maxTotalSize) {
            setError("Uploaded files are too large. Keep total uploaded text under 600KB.");
            return;
        }

        const allowedExtensions = [
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".json",
            ".md",
            ".txt",
            ".yml",
            ".yaml",
            ".config",
        ];

        const readableFiles = selected.filter((file) =>
            allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
        );

        if (readableFiles.length === 0) {
            setError("Upload readable source files such as .ts, .tsx, .js, .json, .md, .yml, or .txt.");
            return;
        }

        const chunks: string[] = [];

        for (const file of readableFiles) {
            if (file.size > maxFileSize) {
                setError(`"${file.name}" is too large. Keep each file under 250KB.`);
                return;
            }

            const text = await file.text();
            chunks.push(`\n\n===FILE: ${file.name}===\n${text}`);
        }

        setUploadedFiles(readableFiles);
        setSourceBundle(chunks.join("\n"));
        setError("");
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (!projectSummary.trim() && !sourceBundle.trim() && !repositoryUrl.trim()) {
            setError("Add a project summary, repository URL, or source files first.");
            return;
        }

        if (selectedFocus.length === 0) {
            setError("Select at least one review focus.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setResult(null);

            const response = await fetch("/api/engineering-review", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    projectName,
                    repositoryUrl,
                    projectSummary,
                    sourceBundle,
                    selectedFocus,
                    depth,
                    uploadedFileNames: uploadedFiles.map((file) => file.name),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to run engineering review.");

                if (typeof data.remaining === "number") {
                    setRemaining(data.remaining);
                }

                return;
            }

            setResult(data.result || null);

            if (typeof data.remaining === "number") {
                setRemaining(data.remaining);
            }
        } catch (err) {
            console.error("Engineering Review error:", err);
            setError("Failed to run engineering review.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-7xl">
                <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.14),transparent_32%)]" />

                    <div className="relative max-w-4xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 sm:text-sm">
                            AI Engineering Review
                        </p>

                        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                            Review architecture, testing, security, and production readiness like a Staff Engineer
                        </h1>

                        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                            Upload source files, framework files, requirements, or repository context.
                            The AI reviews your project from Senior Dev, Lead SDET, QA Architect,
                            and AI Engineering perspectives.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {["Architecture", "Testing", "Security", "Performance", "Maintainability", "Production"].map(
                                (item) => (
                                    <span
                                        key={item}
                                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                                    >
                                        {item}
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-950">Project Input</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Add enough context for the AI to review engineering quality, risk,
                                testability, and production readiness.
                            </p>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Project Name
                                    </label>
                                    <input
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="Playwright automation platform, dashboard app, checkout service..."
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Repository URL / Context
                                    </label>
                                    <input
                                        value={repositoryUrl}
                                        onChange={(e) => setRepositoryUrl(e.target.value)}
                                        placeholder="https://github.com/company/project or internal repo context"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Project Summary / Review Goal
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={projectSummary}
                                        onChange={(e) => setProjectSummary(e.target.value)}
                                        placeholder="Describe the app, architecture, known problems, flaky tests, scaling concerns, release risk, or what you want reviewed..."
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                                    />
                                </div>

                                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4">
                                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                                        Upload Source / Framework Files
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".ts,.tsx,.js,.jsx,.json,.md,.txt,.yml,.yaml,.config"
                                        onChange={(e) => handleFileUpload(e.target.files)}
                                        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                                    />

                                    {uploadedFiles.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {uploadedFiles.map((file) => (
                                                <span
                                                    key={file.name}
                                                    className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-sky-700"
                                                >
                                                    {file.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <p className="mt-3 text-xs leading-5 text-slate-500">
                                        Best files: package.json, playwright.config.ts, fixtures,
                                        page objects, spec files, utils, API clients, CI config.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Source Bundle Preview
                                    </label>
                                    <textarea
                                        rows={10}
                                        value={sourceBundle}
                                        onChange={(e) => setSourceBundle(e.target.value)}
                                        placeholder="Uploaded file contents will appear here. You can also paste repo snippets manually."
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-xs outline-none transition focus:border-sky-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-950">Review Focus</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Select the engineering areas to review. Use Deep Review or Architect
                                Mode for stronger senior-level analysis.
                            </p>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {reviewFocusOptions.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleFocus(item.id)}
                                        className={`rounded-2xl border p-4 text-left transition ${selectedFocus.includes(item.id)
                                                ? "border-sky-300 bg-sky-50 shadow-sm"
                                                : "border-slate-200 bg-white hover:border-sky-200"
                                            }`}
                                    >
                                        <h3 className="text-sm font-semibold text-slate-950">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-xs leading-5 text-slate-600">
                                            {item.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-950">Analysis Depth</h2>

                            <div className="mt-5 grid gap-3">
                                {depthOptions.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setDepth(item.id);
                                            setResult(null);
                                            setError("");
                                        }}
                                        className={`rounded-2xl border p-4 text-left transition ${depth === item.id
                                                ? "border-indigo-300 bg-indigo-50"
                                                : "border-slate-200 bg-white hover:border-indigo-200"
                                            }`}
                                    >
                                        <h3 className="text-sm font-semibold text-slate-950">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-xs leading-5 text-slate-600">
                                            {item.description}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    {remaining === null
                                        ? "Free plan: 5 engineering reviews per day"
                                        : `Free plan: ${remaining} of 5 engineering reviews left today`}
                                </p>

                                <button
                                    type="button"
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-slate-950 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? "Reviewing..." : "Run Engineering Review"}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                                Review Scope
                            </p>
                            <h2 className="mt-2 text-2xl font-bold">
                                {selectedFocusText || "No focus selected"}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                This review is designed for Senior Dev, Lead Dev, Staff Engineer,
                                Senior SDET, QA Architect, and AI Engineering workflows.
                            </p>
                        </div>
                    </div>
                </section>

                {loading && (
                    <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="animate-pulse text-sm font-medium text-slate-600">
                            Reviewing architecture, testing quality, risks, maintainability, and production readiness...
                        </p>
                    </section>
                )}

                {result && (
                    <section className="mt-8 space-y-6">
                        <ExecutiveSummary result={result} />

                        <div className="grid gap-6 xl:grid-cols-2">
                            <FindingCard title="Critical Findings" items={result.criticalFindings} />
                            <FindingCard title="Architecture Intelligence" items={result.architectureIntelligence} />
                            <FindingCard title="Test Intelligence" items={result.testIntelligence} />
                            <FindingCard title="Security Intelligence" items={result.securityIntelligence} />
                            <FindingCard title="Performance Intelligence" items={result.performanceIntelligence} />
                            <FindingCard title="Maintainability Intelligence" items={result.maintainabilityIntelligence} />
                        </div>

                        <FindingCard
                            title="Top Recommended Actions"
                            items={result.recommendedActions}
                            wide
                        />
                    </section>
                )}
            </div>
        </main>
    );
}

function ExecutiveSummary({ result }: { result: EngineeringReviewResult }) {
    return (
        <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Executive Summary
            </p>

            <div className="mt-4 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                    <div className="text-5xl font-bold text-slate-950">
                        {result.overallScore}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Overall Engineering Score</p>

                    <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-950">
                            Production Readiness
                        </p>
                        <p className="mt-1 text-lg font-bold text-sky-700">
                            {result.productionReadiness.status}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {result.productionReadiness.reason}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-sm leading-7 text-slate-700">
                        {result.executiveSummary}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {result.scores.map((score) => (
                            <div
                                key={score.label}
                                className="rounded-2xl border border-sky-100 bg-white p-4"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {score.label}
                                </p>
                                <div className="mt-2 flex items-end justify-between">
                                    <span className="text-2xl font-bold text-slate-950">
                                        {score.score}
                                    </span>
                                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                                        {score.grade}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FindingCard({
    title,
    items,
    wide,
}: {
    title: string;
    items: Finding[];
    wide?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${wide ? "xl:col-span-2" : ""
                }`}
        >
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>

            <div className="mt-4 space-y-4">
                {items.length > 0 ? (
                    items.map((item, index) => (
                        <div
                            key={`${title}-${index}`}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                        >
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <h4 className="text-sm font-semibold text-slate-950">
                                    {item.title}
                                </h4>
                                <SeverityBadge severity={item.severity} />
                            </div>

                            <div className="grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Impact
                                    </p>
                                    <p>{item.impact}</p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Evidence
                                    </p>
                                    <p>{item.evidence}</p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Recommendation
                                    </p>
                                    <p>{item.recommendation}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                        No findings returned.
                    </div>
                )}
            </div>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: Severity }) {
    const className =
        severity === "Critical"
            ? "border-red-200 bg-red-50 text-red-700"
            : severity === "High"
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : severity === "Medium"
                    ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                    : "border-sky-200 bg-sky-50 text-sky-700";

    return (
        <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
        >
            {severity}
        </span>
    );
}