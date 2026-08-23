import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import {
  generateQuickDraft,
  QuickGenerationProviderError,
  type QuickGenerationInput,
} from "@/lib/ai/quick-generation";

const DAILY_FREE_LIMIT = 5;
const MAX_TEXT_FILE_BYTES = 250_000;
const MAX_TEXT_CONTEXT = 500_000;
const MAX_IMAGE_BYTES = 2_000_000;
const allowedModes = new Set<QuickGenerationInput["mode"]>(["FLOW", "MARKUP", "COMPONENT", "API"]);

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "anonymous";
}

function usageKey(ip: string) {
  return `playwrightgen:quick-generate:${ip}:${new Date().toISOString().slice(0, 10)}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const mode = String(formData.get("mode") || "FLOW") as QuickGenerationInput["mode"];
    const request = String(formData.get("request") || "").trim();
    const pageUrl = String(formData.get("pageUrl") || "").trim();
    const depth = String(formData.get("depth") || "FOCUSED") === "EXPANDED" ? "EXPANDED" : "FOCUSED";
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (!allowedModes.has(mode)) return NextResponse.json({ error: "Choose a supported generation mode." }, { status: 400 });
    if (!request && files.length === 0) return NextResponse.json({ error: "Describe the behavior or attach relevant evidence first." }, { status: 400 });
    if (request.length > 30_000 || pageUrl.length > 2_000) return NextResponse.json({ error: "The submitted text is too large." }, { status: 413 });

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const key = usageKey(getClientIp(req));
    const current = (await redis.get<number>(key)) ?? 0;
    if (current >= DAILY_FREE_LIMIT) {
      return NextResponse.json({ error: "Free limit reached for today.", remaining: 0 }, { status: 429 });
    }

    const textParts: string[] = [];
    const imageDataUrls: string[] = [];
    let totalTextBytes = 0;
    for (const file of files.slice(0, 6)) {
      if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: `Image ${file.name} must be under 2MB.` }, { status: 413 });
        imageDataUrls.push(await fileToDataUrl(file));
        continue;
      }
      if (file.size > MAX_TEXT_FILE_BYTES) return NextResponse.json({ error: `File ${file.name} must be under 250KB.` }, { status: 413 });
      totalTextBytes += file.size;
      if (totalTextBytes > MAX_TEXT_CONTEXT) return NextResponse.json({ error: "Keep total attached text under 500KB." }, { status: 413 });
      textParts.push(`===FILE: ${file.name}===\n${await file.text()}`);
    }

    const result = await generateQuickDraft({
      mode,
      request,
      pageUrl,
      depth,
      fileContext: textParts.join("\n\n"),
      imageDataUrls,
    });

    const nextCount = await redis.incr(key);
    if (nextCount === 1) await redis.expire(key, 60 * 60 * 24);

    return NextResponse.json({
      result,
      inputSignals: [
        request ? "Requirement or prompt" : null,
        pageUrl ? "Page URL supplied as context" : null,
        textParts.length ? `${textParts.length} text file${textParts.length === 1 ? "" : "s"}` : null,
        imageDataUrls.length ? `${imageDataUrls.length} image${imageDataUrls.length === 1 ? "" : "s"}` : null,
      ].filter(Boolean),
      remaining: Math.max(0, DAILY_FREE_LIMIT - nextCount),
    });
  } catch (error) {
    const message = error instanceof QuickGenerationProviderError
      ? error.code === "configuration_missing"
        ? "AI generation is not configured."
        : "The model could not produce a safe structured draft. Please refine the input and try again."
      : "Quick Generate failed. Please try again.";
    console.error("Quick Generate API error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
