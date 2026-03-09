"use client";

import { useState } from "react";
import Link from "next/link";

export default function PricingPage() {
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [email, setEmail] = useState("");
    return (
        <main className="min-h-screen bg-white px-6 py-16">
            <div className="mx-auto max-w-5xl">
                <div className="mb-12 text-center">
                    <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
                        Pricing
                    </p>

                    <h1 className="mb-4 text-5xl font-bold tracking-tight text-black">
                        Simple pricing for modern automation teams
                    </h1>

                    <p className="mx-auto max-w-2xl text-gray-600">
                        Start with the free plan and upgrade when you need more advanced AI-powered Playwright automation features.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 p-8">
                        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
                            Free
                        </p>

                        <h2 className="mb-4 text-3xl font-bold">$0</h2>

                        <ul className="mb-8 space-y-3 text-gray-600">
                            <li>5 test generations per day</li>
                            <li>Text to Playwright test</li>
                            <li>HTML to Playwright test</li>
                            <li>API test generation</li>
                            <li>Copy code</li>
                            <li>Download .ts file</li>
                        </ul>

                        <Link
                            href="/generator"
                            className="inline-block rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Continue with Free
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-black bg-black p-8 text-white">
                        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-300">
                            Pro
                        </p>

                        <h2 className="mb-4 text-3xl font-bold">$12 / month</h2>

                        <ul className="mb-8 space-y-3 text-gray-300">
                            <li>Unlimited test generations</li>
                            <li>URL analysis</li>
                            <li>Advanced AI automation workflows</li>
                            <li>Senior SDET style generation</li>
                            <li>Faster test creation for teams</li>
                            <li>Future premium automation features</li>
                        </ul>

                        <button
                            onClick={() => setShowWaitlist(true)}
                            className="mt-6 w-full rounded-lg bg-white px-4 py-3 font-medium text-black hover:opacity-90"
                        >
                            Join Pro Waitlist
                        </button>
                        <p className="mt-3 text-center text-sm text-gray-500">
                            Early access coming soon
                        </p>
                    </div>
                </div>
            </div>
            {showWaitlist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="mb-2 text-2xl font-bold text-black">
                            Join Pro Waitlist
                        </h2>

                        <p className="mb-4 text-sm text-gray-600">
                            Get early access to PlaywrightGen Pro and future premium automation features.
                        </p>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mb-4 w-full rounded-lg border border-gray-300 p-3 outline-none"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowWaitlist(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    alert(`Thanks! ${email || "Your email"} has been added to the waitlist.`);
                                    setEmail("");
                                    setShowWaitlist(false);
                                }}
                                className="rounded-lg bg-black px-4 py-2 text-white"
                            >
                                Join Waitlist
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}