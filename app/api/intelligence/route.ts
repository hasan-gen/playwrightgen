import OpenAI from "openai";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const DAILY_FREE_LIMIT = 5;

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function getClientIp(req: Request) {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "anonymous"
    );
}

function getDailyUsageKey(ip: string) {
    const today = new Date().toISOString().slice(0, 10);
    return `playwrightgen:intelligence:${ip}:${today}`;
}

function cleanJson(raw: string) {
    return raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
}

export async function POST(req: Request) {
    try {
        const { mode, url, requirement, existingTests } = await req.json();

        if (!url && !requirement && !existingTests) {
            return NextResponse.json(
                { error: "URL, requirement, or existing test code is required." },
                { status: 400 }
            );
        }

        const ip = getClientIp(req);
        const usageKey = getDailyUsageKey(ip);

        const currentCount = ((await redis.get<number>(usageKey)) ?? 0) as number;

        if (currentCount >= DAILY_FREE_LIMIT) {
            return NextResponse.json(
                {
                    error:
                        "Free limit reached (5 intelligence analyses per day). Upgrade to Pro for unlimited analysis.",
                    remaining: 0,
                },
                { status: 429 }
            );
        }

        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.25,
            messages: [
                {
                    role: "system",
                    content: `You are an elite Senior Software Engineer, Lead Developer, Senior SDET, QA Architect, and Playwright automation strategist.

This is NOT a basic QA coverage tool.
This is an AI engineering intelligence engine.

Your job is to analyze requirements, URLs, existing Playwright tests, and automation signals like a senior engineer reviewing a real production codebase.

Focus on:
- missing business-critical coverage
- weak assertions
- flaky automation risks
- poor selector strategy
- duplicated or shallow tests
- architecture issues
- missing negative paths
- missing edge cases
- regression risk
- next highest-value tests to automate

Return ONLY valid JSON in this exact shape:

{
 "coverageScore": 0,
 "coverageGaps": ["..."],
 "missingScenarios": ["..."],
 "riskPriority": ["..."],
 "suggestedNextTests": ["..."]
}

Rules:
- Do not include markdown fences
- Do not include explanations outside JSON
- Be specific and practical
- Avoid generic advice
- Think like a Senior Dev + Lead SDET, not a junior QA
- Prioritize product risk, engineering quality, and automation maintainability
- If existing tests are provided, compare them against the requirement and identify what is missing
- If only a requirement is provided, create a senior-level risk-based test intelligence plan
- If a URL is provided, infer likely behavior from the URL context only; do not claim live inspection
- Suggested next tests must be ready to send into a Playwright generator later`,
                },
                {
                    role: "user",
                    content: `Analysis Mode:
${mode || "gaps"}

Page URL:
${url || "Not provided"}

Requirement / User Flow:
${requirement || "Not provided"}

Existing Playwright Tests:
${existingTests || "Not provided"}

Analyze this like a senior engineering intelligence review and return only JSON.`,
                },
            ],
        });

        const raw = completion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(cleanJson(raw));
        } catch {
            return NextResponse.json(
                { error: "AI returned invalid JSON. Please try again." },
                { status: 500 }
            );
        }

        const newCount = await redis.incr(usageKey);

        if (newCount === 1) {
            await redis.expire(usageKey, 60 * 60 * 24);
        }

        const remaining = Math.max(0, DAILY_FREE_LIMIT - newCount);

        return NextResponse.json({
            result: {
                coverageScore:
                    typeof parsed.coverageScore === "number" ? parsed.coverageScore : 70,
                coverageGaps: Array.isArray(parsed.coverageGaps)
                    ? parsed.coverageGaps
                    : [],
                missingScenarios: Array.isArray(parsed.missingScenarios)
                    ? parsed.missingScenarios
                    : [],
                riskPriority: Array.isArray(parsed.riskPriority)
                    ? parsed.riskPriority
                    : [],
                suggestedNextTests: Array.isArray(parsed.suggestedNextTests)
                    ? parsed.suggestedNextTests
                    : [],
            },
            remaining,
        });
    } catch (error) {
        console.error("Test Intelligence API error:", error);

        return NextResponse.json(
            { error: "Failed to analyze test intelligence." },
            { status: 500 }
        );
    }
}