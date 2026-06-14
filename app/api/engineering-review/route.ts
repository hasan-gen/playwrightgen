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
    return `playwrightgen:engineering-review:${ip}:${today}`;
}

function cleanJson(raw: string) {
    return raw.replace(/```json/g, "").replace(/```/g, "").trim();
}

function normalizeFinding(item: any) {
    const severity =
        item?.severity === "Critical" ||
            item?.severity === "High" ||
            item?.severity === "Medium" ||
            item?.severity === "Low"
            ? item.severity
            : "Medium";

    return {
        title: typeof item?.title === "string" ? item.title : "Untitled finding",
        severity,
        impact:
            typeof item?.impact === "string"
                ? item.impact
                : "Impact was not clearly provided.",
        evidence:
            typeof item?.evidence === "string"
                ? item.evidence
                : "Evidence was not clearly provided.",
        recommendation:
            typeof item?.recommendation === "string"
                ? item.recommendation
                : "Recommendation was not clearly provided.",
    };
}

function normalizeFindings(items: any) {
    return Array.isArray(items) ? items.map(normalizeFinding) : [];
}

export async function POST(req: Request) {
    try {
        const {
            projectName,
            repositoryUrl,
            projectSummary,
            sourceBundle,
            selectedFocus,
            depth,
            uploadedFileNames,
        } = await req.json();

        if (!projectSummary && !sourceBundle && !repositoryUrl) {
            return NextResponse.json(
                { error: "Project summary, repository URL, or source files are required." },
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
                        "Free limit reached (5 engineering reviews per day). Upgrade to Pro for unlimited reviews.",
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
                    content: `You are an elite AI Engineering Review system.

You review software projects like a Staff Engineer, Principal Engineer, AI Architect, Lead Developer, Senior SDET, QA Architect, and Engineering Director.

This is NOT a basic code summary tool.
This is NOT a simple QA tool.
This is an engineering intelligence review engine.

Your job is to evaluate:
- architecture quality
- testing strategy
- security posture
- performance risk
- maintainability
- production readiness
- automation quality
- engineering scalability
- developer experience
- hidden technical debt
- release risk

Think like a real senior engineering review board.

Return ONLY valid JSON in this exact shape:

{
"overallScore": 0,
"executiveSummary": "...",
"scores": [
{ "label": "Architecture", "score": 0, "grade": "A" },
{ "label": "Testing", "score": 0, "grade": "B" },
{ "label": "Security", "score": 0, "grade": "C" },
{ "label": "Performance", "score": 0, "grade": "B" },
{ "label": "Maintainability", "score": 0, "grade": "B" },
{ "label": "Production", "score": 0, "grade": "B" }
],
"productionReadiness": {
"status": "Ready | Partially Ready | Not Ready",
"reason": "..."
},
"criticalFindings": [
{
"title": "...",
"severity": "Critical | High | Medium | Low",
"impact": "...",
"evidence": "...",
"recommendation": "..."
}
],
"architectureIntelligence": [],
"testIntelligence": [],
"securityIntelligence": [],
"performanceIntelligence": [],
"maintainabilityIntelligence": [],
"recommendedActions": []
}

Rules:
- Return JSON only
- Do not include markdown fences
- Do not include comments in JSON
- Be specific to the provided project context
- Avoid generic advice
- Think like a Staff Engineer and Lead SDET
- If source files are limited, clearly infer from available evidence
- Do not claim live repo inspection unless source content is provided
- Use realistic scores
- recommendedActions must be ranked and actionable
- Every finding must include title, severity, impact, evidence, and recommendation`,
                },
                {
                    role: "user",
                    content: `Project Name:
${projectName || "Not provided"}

Repository URL:
${repositoryUrl || "Not provided"}

Project Summary:
${projectSummary || "Not provided"}

Selected Review Focus:
${Array.isArray(selectedFocus) ? selectedFocus.join(", ") : "Not provided"}

Analysis Depth:
${depth || "deep"}

Uploaded File Names:
${Array.isArray(uploadedFileNames) ? uploadedFileNames.join(", ") : "None"}

Source / Framework Bundle:
${sourceBundle || "Not provided"}

Run a senior-level engineering review and return only JSON.`,
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
                overallScore:
                    typeof parsed.overallScore === "number" ? parsed.overallScore : 70,
                executiveSummary:
                    typeof parsed.executiveSummary === "string"
                        ? parsed.executiveSummary
                        : "Engineering review completed.",
                scores: Array.isArray(parsed.scores) ? parsed.scores : [],
                productionReadiness: {
                    status:
                        parsed?.productionReadiness?.status === "Ready" ||
                            parsed?.productionReadiness?.status === "Partially Ready" ||
                            parsed?.productionReadiness?.status === "Not Ready"
                            ? parsed.productionReadiness.status
                            : "Partially Ready",
                    reason:
                        typeof parsed?.productionReadiness?.reason === "string"
                            ? parsed.productionReadiness.reason
                            : "Production readiness requires further review.",
                },
                criticalFindings: normalizeFindings(parsed.criticalFindings),
                architectureIntelligence: normalizeFindings(parsed.architectureIntelligence),
                testIntelligence: normalizeFindings(parsed.testIntelligence),
                securityIntelligence: normalizeFindings(parsed.securityIntelligence),
                performanceIntelligence: normalizeFindings(parsed.performanceIntelligence),
                maintainabilityIntelligence: normalizeFindings(parsed.maintainabilityIntelligence),
                recommendedActions: normalizeFindings(parsed.recommendedActions),
            },
            remaining,
        });
    } catch (error) {
        console.error("Engineering Review API error:", error);

        return NextResponse.json(
            { error: "Failed to run engineering review." },
            { status: 500 }
        );
    }
}