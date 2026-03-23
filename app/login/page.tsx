"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STORAGE_KEY = "playwrightgen_user_email";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/generator";

    const [email, setEmail] = useState("");

    useEffect(() => {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing) {
            router.replace(next);
        }
    }, [router, next]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const normalized = email.trim().toLowerCase();

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(normalized)) {
            alert("Please enter a valid email address.");
            return;
        }

        localStorage.setItem(STORAGE_KEY, normalized);
        localStorage.removeItem("proEmail");
        router.push(next);
    };

    return (
        <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-gray-500 sm:text-sm">
                    Continue to PlaywrightGen
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-black">
                    Sign in to start generating
                </h1>

                <p className="mt-3 text-sm text-gray-600">
                    Use your email to continue to the generator and save your access on this device.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-black">
                            Email address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 text-base outline-none transition focus:border-black"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-black px-6 py-3 text-base font-medium text-white transition hover:opacity-90"
                    >
                        Continue
                    </button>
                </form>
            </div>
        </main>
    );
}