"use client";

import { useState } from "react";
import Link from "next/link";

export default function PricingPage() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <main className="min-h-screen px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Pricing
          </p>

          <h1 className="mb-4 text-5xl font-bold tracking-tight text-black md:text-6xl">
            Simple pricing for AI-powered test generation
          </h1>

          <p className="mx-auto max-w-2xl text-gray-600">
            Start free, validate your workflow, and upgrade when you need more
            advanced AI-powered automation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
              Free
            </p>

            <h2 className="mb-4 text-4xl font-bold text-black">$0</h2>

            <ul className="mb-8 space-y-3 text-gray-600">
              <li>5 generations per day</li>
              <li>Prompt → Playwright test</li>
              <li>HTML / JSX → test generation</li>
              <li>API test generation</li>
              <li>Component → Playwright test</li>
              <li>Component → unit test</li>
              <li>Copy and download output</li>
            </ul>

            <Link
              href="/generator"
              className="inline-block rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Continue with Free
            </Link>
          </div>

          <div className="rounded-3xl border border-black bg-black p-8 text-white shadow-sm">
            <span className="mb-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              ⭐ Most Popular
            </span>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-gray-300">
              Pro Plan
            </p>

            <h2 className="mb-4 text-4xl font-bold">$12 / month</h2>

            <ul className="mb-8 space-y-3 text-gray-300">
              <li>Unlimited generations</li>
              <li>URL analysis</li>
              <li>Production-grade automation output</li>
              <li>Advanced AI workflows</li>
              <li>Faster generation for dev and QA teams</li>
              <li>Future premium automation features</li>
            </ul>

            <button
              onClick={() => setShowWaitlist(true)}
              className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90"
            >
              Join Pro Waitlist
            </button>

            <p className="mt-3 text-center text-sm text-gray-400">
              Early access coming soon
            </p>
          </div>
        </div>
      </div>

      {showWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-2xl font-bold text-black">
              Join Pro Waitlist
            </h2>

            <p className="mb-4 text-sm text-gray-600">
              Get early access to PlaywrightGen Pro and upcoming premium automation
              features.
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-xl border border-gray-300 p-3 outline-none transition focus:border-black"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowWaitlist(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  alert(`Thanks! ${email || "Your email"} has been added to the waitlist.`);
                  setEmail("");
                  setShowWaitlist(false);
                }}
                className="rounded-xl bg-black px-4 py-2 text-white"
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