"use client";
import { useState } from "react";

export default function CoveragePage() {
    const [url, setUrl] = useState("");
    const [requirement, setRequirement] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        coreFlows: string[];
        validationCases: string[];
        edgeCases: string[];
        highRiskAreas: string[];
    } | null>(null);

    const handleAnalyze = async () => {
        if (!url && !requirement) return;

        try {
            setLoading(true);
            setResult(null);

            const response = await fetch("/api/coverage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url, requirement }),
            });

            const data = await response.json();

            if (!response.ok) {
                setResult(null);
                return;
            }

            setResult(data.result || null);
        } catch (error) {
            console.error("Coverage error:", error);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };
    return (
        <main className="min-h-screen bg-[hashtag#F8FAFC] px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-6xl">
                <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
                    <div className="max-w-3xl">
                        <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 sm:text-sm">
                            Coverage Planning
                        </p>

                        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                            AI Test Coverage Planner
                        </h1>

                        <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
                            Analyze a page, flow, or requirement and generate a structured
                            test coverage plan before writing any tests.
                        </p>
                    </div>
                </section>
                <div className="mt-8 grid gap-6 lg:grid-cols-2">

                    {/* URL Input */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Page URL
                        </label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-sky-500"
                        />
                    </div>

                    {/* Requirement Input */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Requirement / User Flow
                        </label>
                        <textarea
                            rows={4}
                            value={requirement}
                            onChange={(e) => setRequirement(e.target.value)}
                            placeholder="User should be able to login..."
                            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-sky-500"
                        />
                    </div>

                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-black px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "Analyzing..." : "Analyze Coverage"}
                    </button>
                </div>
                {result && (
                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="mb-4 text-base font-semibold text-slate-900">
                                Core Flows
                            </h2>
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="rounded-xl bg-slate-50 p-3">
                                User can log in with valid credentials
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                User can navigate to forgot password
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                User lands on dashboard after successful login
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-4 text-base font-semibold text-slate-900">
                            Validation Cases
                        </h2>
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="rounded-xl bg-slate-50 p-3">
                                Empty email shows validation message
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                Empty password blocks submission
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                Invalid credentials show error feedback
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-4 text-base font-semibold text-slate-900">
                            Edge Cases
                        </h2>
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="rounded-xl bg-slate-50 p-3">
                                Multiple rapid clicks on login button
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                Browser refresh during login flow
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                Special characters in email field
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-4 text-base font-semibold text-slate-900">
                            High-Risk Areas
                        </h2>
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="rounded-xl bg-slate-50 p-3">
                                Authentication failure handling
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                Redirect behavior after login
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                Error state visibility and timing
                            </div>
                        </div>
                    </div>
                </div>
                )}

            </div>
        </main>
    );
}