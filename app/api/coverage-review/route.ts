import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import {
  CoverageReviewProviderError,
  reviewCoverage,
  type CoverageReviewInput,
} from "@/lib/ai/coverage-review";

const DAILY_FREE_LIMIT = 5;
const lenses = new Set<CoverageReviewInput["lens"]>(["COVERAGE", "FLAKY", "ARCHITECTURE", "ASSERTIONS"]);

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
}

async function imageDataUrl(file: File) {
  return `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const lens = String(formData.get("lens") || "COVERAGE") as CoverageReviewInput["lens"];
    const pageUrl = String(formData.get("pageUrl") || "").trim();
    const requirement = String(formData.get("requirement") || "").trim();
    const existingTests = String(formData.get("existingTests") || "").trim();
    const screenshotValue = formData.get("screenshot");
    const screenshot = screenshotValue instanceof File && screenshotValue.size > 0 ? screenshotValue : null;

    if (!lenses.has(lens)) return NextResponse.json({ error: "Choose a supported review lens." }, { status: 400 });
    if (!pageUrl && !requirement && !existingTests && !screenshot) return NextResponse.json({ error: "Add a requirement, test, URL, or screenshot first." }, { status: 400 });
    if (pageUrl.length > 2_000 || requirement.length > 30_000 || existingTests.length > 250_000) return NextResponse.json({ error: "The submitted evidence is too large for one preliminary review." }, { status: 413 });
    if (screenshot && (!screenshot.type.startsWith("image/") || screenshot.size > 2_000_000)) return NextResponse.json({ error: "Use a PNG, JPEG, or WebP screenshot under 2MB." }, { status: 413 });

    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
    const key = `playwrightgen:coverage-review:${getClientIp(req)}:${new Date().toISOString().slice(0, 10)}`;
    const current = (await redis.get<number>(key)) ?? 0;
    if (current >= DAILY_FREE_LIMIT) return NextResponse.json({ error: "Free limit reached for today.", remaining: 0 }, { status: 429 });

    const result = await reviewCoverage({
      lens,
      pageUrl,
      requirement,
      existingTests,
      screenshotDataUrl: screenshot ? await imageDataUrl(screenshot) : "",
    });

    const nextCount = await redis.incr(key);
    if (nextCount === 1) await redis.expire(key, 60 * 60 * 24);
    return NextResponse.json({ result, remaining: Math.max(0, DAILY_FREE_LIMIT - nextCount) });
  } catch (error) {
    const message = error instanceof CoverageReviewProviderError
      ? error.code === "configuration_missing"
        ? "AI review is not configured."
        : "The model could not produce a reliable structured review. Refine the evidence and try again."
      : "Coverage Review failed. Please try again.";
    console.error("Coverage Review API error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
