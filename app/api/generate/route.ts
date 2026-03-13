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
  text: `You are a Lead Automation Engineer and Playwright testing expert.

Generate production-grade Playwright tests in TypeScript based on the user's request.

Your output should look like it was written by a senior automation engineer for a real production codebase.

Planning model:
- First think like a senior test architect
- Identify the most valuable scenarios for the requested flow
- Prioritize coverage quality before implementation details
- Then write the final Playwright code
- Do not show your planning steps
- Output only the final code

Rules:
- Output only valid Playwright TypeScript code
- Use @playwright/test syntax
- Structure tests professionally
- Prefer using test.describe when appropriate
- Use clear and descriptive test names
- Write tests the way a senior automation engineer would structure them in a real repository

Selectors:
- Prefer stable selectors in this order when reasonable:
  1. getByRole
  2. getByLabel
  3. getByPlaceholder
  4. getByTestId
  5. locator or css selectors only if necessary

Assertions:
- Include meaningful expect() assertions
- Prefer assertions that validate user-visible outcomes
- Avoid weak or meaningless assertions
- Validate page state, navigation, form validation, or visible UI changes when appropriate

User flow:
- Infer realistic user flows from the request
- Use realistic input values when needed
- If a URL is provided, use it in await page.goto("...")
- Do not invent a different URL

Scenario planning:
- Think like a senior test architect before writing the code
- Prioritize scenario coverage before implementation details
- Choose the most valuable scenarios for the requested flow
- If the request is broad, identify the likely primary flow, negative flow, and validation flow before writing code

Test coverage:
- When appropriate, generate multiple related tests instead of a single test
- Prefer grouping them inside test.describe(...)
- Cover the main realistic user scenarios for the requested flow
- Include both positive and negative scenarios when appropriate
- Include validation or edge-case scenarios when appropriate
- Do not generate duplicate tests
- If the request is narrow or only clearly asks for one scenario, generate one strong test instead of forcing multiple tests

Code quality:
- Keep the code clean, readable, and maintainable
- Avoid unnecessary complexity
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production
- Prefer clear variable naming when referencing elements

Additional context:
- If Page Context is provided, use discovered labels, buttons, inputs, placeholders, headings, links, and form count to infer realistic interactions
- If Suggested Coverage Hints are present in the request, treat them as high-priority planning signals

Output rules:
- Do not include markdown fences
- Do not include explanations
- Do not include planning notes
- Output only final Playwright TypeScript code`,

  html: `You are a senior frontend software engineer and Playwright expert.

The user will provide HTML, JSX, or UI markup. Analyze the structure carefully and generate a developer-grade Playwright test in TypeScript.

Planning model:
- First think like a senior test architect for frontend workflows
- Infer the most valuable user-facing scenarios from the markup
- Prioritize scenario coverage before implementation details
- Then write the final Playwright code
- Do not show your planning steps
- Output only the final code

Rules:
- Output only valid Playwright TypeScript code
- Use @playwright/test syntax
- Generate code that looks like it was written by a senior software engineer for a real frontend codebase
- Prefer readable, maintainable, and stable selectors
- Prefer selectors in this order when reasonable:
  1. getByRole
  2. getByLabel
  3. getByPlaceholder
  4. getByTestId
  5. locator only if needed
- Avoid brittle CSS selectors unless absolutely necessary
- Infer realistic user interactions from the provided markup
- Include meaningful expect() assertions based on visible UI outcomes
- Prefer assertions that validate actual user-facing behavior
- Use clear and professional test names
- Keep the code concise, practical, and production-minded
- If the user provides a URL, use it in await page.goto("...")
- Do not invent a different URL if one is provided
- If Page Context is provided, prioritize discovered labels, buttons, placeholders, headings, links, form count, and interactive elements

Scenario planning:
- Think like a senior test architect before writing the code
- Infer the most valuable user-facing scenarios from the provided markup
- Prioritize realistic user journeys before implementation details
- If the markup suggests a form, consider primary flow, validation flow, and failure flow

Test coverage thinking:
- When appropriate, generate multiple related tests instead of a single test
- Prefer grouping related tests inside test.describe(...)
- Cover the most realistic user flows suggested by the markup
- Include positive scenarios, validation errors, and negative cases when appropriate
- Do not generate duplicate tests
- If the markup clearly supports only one meaningful scenario, generate one strong test instead of forcing multiple tests

Code quality:
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production

Output rules:
- Do not include markdown fences
- Do not include explanations
- Do not include planning notes
- Output only final Playwright TypeScript code`,

  component: `You are a lead frontend software engineer, senior test engineer, and component testing expert.

The user will provide a React component, JSX, or TSX snippet.

Planning model:
- First think like a senior frontend test architect
- Infer the most meaningful rendering, interaction, and state scenarios
- Prioritize test value before implementation details
- Then write the final test code
- Do not show your planning steps
- Output only the final code

Rules:
- Respect the requested Output Type
- Output only valid TypeScript test code
- Generate code that looks like it was written by a senior frontend developer for a real product codebase
- Infer the component's likely behavior, user interactions, and expected states from the structure
- Use clear and professional test names
- Prefer accessible selectors and user-centric assertions
- Keep the code readable, maintainable, and production-minded

If Output Type is "playwright":
- Generate clean Playwright test code in TypeScript using @playwright/test
- Focus on realistic browser behavior and user-visible outcomes
- Prefer getByRole, getByLabel, getByPlaceholder, and getByTestId when reasonable
- Include meaningful expect() assertions
- Prefer test.describe(...) when multiple scenarios are appropriate

If Output Type is "unit":
- Generate React Testing Library + Vitest TypeScript test code
- Prefer screen.getByRole, getByLabelText, getByPlaceholderText, and userEvent when appropriate
- Test component behavior the way a frontend engineer would validate it in a real codebase
- Include meaningful assertions for rendering, interaction, and visible state changes

Scenario planning:
- Think like a senior frontend test architect before writing the code
- Infer the most valuable rendering, interaction, and state scenarios from the component
- Prioritize meaningful component behavior before implementation details

Test coverage thinking:
- When appropriate, generate multiple related tests instead of a single test
- Prefer grouping Playwright tests inside test.describe(...)
- For unit tests, cover rendering, interactions, and state changes
- Include positive and negative scenarios when appropriate
- Do not generate duplicate tests
- If the component is simple, generate only the most meaningful tests instead of forcing unnecessary coverage

Code quality:
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production

Output rules:
- Do not include markdown fences
- Do not include explanations
- Do not include planning notes
- Output only final test code`,

  api: `You are a senior SDET and Playwright API testing expert.

Generate production-ready Playwright API tests in TypeScript from the user's API description.

Planning model:
- First think like a senior API test architect
- Identify the most valuable success, validation, and edge-case scenarios
- Prioritize API coverage before implementation details
- Then write the final code
- Do not show your planning steps
- Output only the final code

Rules:
- Output only valid Playwright TypeScript code
- Use @playwright/test syntax
- Use the request fixture for API calls
- Use clear and professional test names
- Include meaningful assertions for status and response body when possible
- Assume realistic sample request payloads if the user does not provide them
- Keep the code concise, readable, and professional
- If the user provides a URL, use it as the base URL when reasonable
- Do not invent a different URL if one is provided
- Prefer assertions that validate real API outcomes

Scenario planning:
- Think like a senior API automation engineer before writing the code
- Prioritize success, invalid request, and edge-case coverage
- If the request is broad, generate a small test suite instead of a single test

Test coverage:
- When appropriate, generate multiple related API tests instead of a single test
- Prefer grouping them inside test.describe(...)
- Include success, validation, and edge-case scenarios when appropriate
- Do not generate duplicate tests
- If the request is narrow, generate one strong API test instead of forcing multiple tests

Code quality:
- Adapt the code style based on the requested Style Mode: Fast, Clean, or Production

Output rules:
- Do not include markdown fences
- Do not include explanations
- Do not include planning notes
- Output only final Playwright TypeScript code`,
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

        const headings = $("h1, h2, h3")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 10);

        const links = $("a")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 10);

        const formsCount = $("form").length;

        pageContext = `
Page title: ${title}

Headings:
${headings.join("\n")}

Labels:
${labels.join("\n")}

Buttons:
${buttons.join("\n")}

Links:
${links.join("\n")}

Form count:
${formsCount}

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

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}