"use client";

import { useState } from "react";
import Link from "next/link";
import { FREE_PLAN, PRO_PLAN, PRO_WAITLIST_COPY } from "../../lib/plan";

export default function PricingPage() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState("");

  const handleJoinWaitlist = async () => {
    if (!email.trim()) {
      setWaitlistMessage("Please enter your email.");
      return;
    }

    try {
      setWaitlistLoading(true);
      setWaitlistMessage("");

      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWaitlistMessage(data.error || "Failed to join waitlist.");
        return;
      }

      setWaitlistMessage("You're on the waitlist.");
      setEmail("");
    } catch (error) {
      console.error("Pricing waitlist submit error:", error);
      setWaitlistMessage("Failed to join waitlist.");
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      alert(data.error || "Failed to start checkout.");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout.");
    }
  };

  return (
    <>
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
                {FREE_PLAN.name}
              </p>

              <h2 className="mb-4 text-4xl font-bold text-black">
                {FREE_PLAN.priceLabel}
              </h2>

              <ul className="mb-8 space-y-3 text-gray-600">
                {FREE_PLAN.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
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
                {PRO_PLAN.name} Plan
              </p>

              <h2 className="mb-4 text-4xl font-bold">
                {PRO_PLAN.priceLabel} {PRO_PLAN.intervalLabel}
              </h2>

              <ul className="mb-8 space-y-3 text-gray-300">
                {PRO_PLAN.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <button
                onClick={handleUpgradeToPro}
                className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90"
              >
                Upgrade to Pro
              </button>

              <p className="mt-3 text-center text-sm text-gray-400">
                Built for individual developers today. Team and enterprise options coming soon.
              </p>

              <button
                onClick={() => {
                  setShowWaitlist(true);
                  setWaitlistMessage("");
                }}
                className="mt-3 block w-full text-center text-sm text-gray-300 underline underline-offset-4 transition hover:text-white"
              >
                Need enterprise access or future premium features? Join the waitlist
              </button>
            </div>
          </div>
        </div>
      </main>

      {showWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-2xl font-bold text-black">
              {PRO_WAITLIST_COPY.title}
            </h2>

            <p className="mb-4 text-sm text-gray-600">
              {PRO_WAITLIST_COPY.description}
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-xl border border-gray-300 p-3 outline-none transition focus:border-black"
            />

            {waitlistMessage && (
              <p className="mb-4 text-sm text-gray-600">{waitlistMessage}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowWaitlist(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleJoinWaitlist}
                disabled={waitlistLoading}
                className="rounded-xl bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {waitlistLoading ? "Joining..." : PRO_WAITLIST_COPY.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}