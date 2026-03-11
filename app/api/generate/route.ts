import OpenAI from "openai";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { Redis } from "@upstash/redis";

const DAILY_FREE_LIMIT = 5;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const systemPrompts = {
  text: `You are a senior SDET and Playwright expert.

Generate a clean, production-ready Playwright test in TypeScript based on the user's request.

Rules:
- Output only valid Playwright TypeScript code
- Use @playwright/test syntax
- Include one complete test()
- Use a clear and professional test name
- Prefer stable selectors in this order when reasonable:
  1. getByRole
  2. getByLabel
  3. getByPlaceholder
  4. getByTestId
  5. locator or css selectors only if needed
- Include meaningful expect() assertions
- Use realistic sample values when needed
- If the user provides a URL, use it in await page.goto("...")
- Do not invent a different URL if one is provided
- If Page Context is provided, use it to infer realistic inputs, buttons, labels, and likely user flow
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production
- Keep the code concise, readable, and professional
- Prefer assertions that validate user-visible results
- Avoid brittle selectors when possible
- Do not include markdown fences
- Do not include explanations`,

  html: `You are a senior SDET and Playwright expert.

The user will provide HTML or JSX. Analyze the structure carefully and generate a production-ready Playwright test in TypeScript.

Rules:
- Output only valid Playwright TypeScript code
- Use @playwright/test syntax
- Include one complete test()
- Infer realistic user interactions from the HTML
- Prefer stable selectors in this order when reasonable:
  1. getByRole
  2. getByLabel
  3. getByPlaceholder
  4. getByTestId
  5. ids or css selectors only if needed
- If a button has visible text, prefer getByRole("button", { name: "..." })
- If an input has a placeholder, prefer getByPlaceholder("...")
- If a label is clearly associated, prefer getByLabel("...")
- If an element has an id and no better accessible selector exists, you may use locator("#id")
- Include at least one meaningful expect() assertion
- Prefer assertions that validate visible UI outcomes
- Keep the code practical, readable, and professional
- Use accessible selectors whenever possible
- If the user provides a URL, use it in await page.goto("...")
- Do not invent a different URL if one is provided
- If Page Context is provided, prioritize the discovered labels, buttons, inputs, and placeholders when generating selectors
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production
- Do not include markdown fences
- Do not include explanations`,

  component: `You are a senior frontend engineer, SDET, and Playwright expert.

The user will provide a React component, JSX, or TSX snippet.

Rules:
- Respect the requested Output Type
- If Output Type is "playwright", generate a clean Playwright test in TypeScript using @playwright/test
- If Output Type is "unit", generate a React Testing Library + Vitest TypeScript test
- Output only valid code
- Use clear and professional test names
- Prefer accessible selectors when possible
- Include meaningful assertions
- Infer realistic interactions from the component structure
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production
- Do not include markdown fences
- Do not include explanations`,

  api: `You are a senior SDET and Playwright API testing expert.

Generate a production-ready Playwright API test in TypeScript from the user's API description.

Rules:
- Output only valid Playwright TypeScript code
- Use @playwright/test syntax
- Use the request fixture for API calls
- Include one complete test()
- Use a clear and professional test name
- Include meaningful assertions for status and response body when possible
- Assume realistic sample request payloads if the user does not provide them
- Keep the code concise, readable, and professional
- If the user provides a URL, use it as the base URL when reasonable
- Do not invent a different URL if one is provided
- Prefer assertions that validate real API outcomes
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production
- Do not include markdown fences
- Do not include explanations`,
};

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function getDailyUsageKey(ip: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `playwrightgen:usage:${ip}:${today}`;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const usageKey = getDailyUsageKey(ip);

    const currentCount = ((await redis.get<number>(usageKey)) ?? 0) as number;

    if (currentCount >= DAILY_FREE_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Free limit reached (5 generations per day). Upgrade to Pro for unlimited generation.",
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const { mode, prompt, url, styleMode, outputType } = await req.json();
    let pageContext = "";

    if (!prompt || !mode) {
      return NextResponse.json(
        { error: "Mode and prompt are required." },
        { status: 400 }
      );
    }

    if (url && (mode === "text" || mode === "html" || mode === "component")) {
      try {
        const response = await fetch(url);
        const html = await response.text();

        const $ = cheerio.load(html);

        const title = $("title").text().trim();

        const inputs = $("input")
          .map((_, el) => {
            const id = $(el).attr("id") || "";
            const name = $(el).attr("name") || "";
            const type = $(el).attr("type") || "";
            const placeholder = $(el).attr("placeholder") || "";
            return `input: id="${id}", name="${name}", type="${type}", placeholder="${placeholder}"`;
          })
          .get()
          .slice(0, 10);

        const buttons = $("button")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 10);

        const labels = $("label")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 10);

        pageContext = `
Page title: ${title}

Labels:
${labels.join("\n")}

Buttons:
${buttons.join("\n")}

Inputs:
${inputs.join("\n")}
`.trim();
      } catch (error) {
        console.error("URL fetch error:", error);
        pageContext = "Could not fetch page HTML context.";
      }
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            systemPrompts[mode as keyof typeof systemPrompts] || systemPrompts.text,
        },
        {
          role: "user",
          content: `${url ? `URL: ${url}\n\n` : ""}${
            pageContext ? `Page Context:\n${pageContext}\n\n` : ""
          }Style Mode: ${styleMode || "clean"}\nOutput Type: ${
            outputType || "playwright"
          }\n\nRequest: ${prompt}`,
        },
      ],
    });

    const result = completion.choices[0]?.message?.content || "";

    const newCount = await redis.incr(usageKey);

    if (newCount === 1) {
      await redis.expire(usageKey, 60 * 60 * 24);
    }

    const remaining = Math.max(0, DAILY_FREE_LIMIT - newCount);

    return NextResponse.json({
      result,
      remaining,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);

    return NextResponse.json(
      { error: "Failed to generate code." },
      { status: 500 }
    );
  }
}