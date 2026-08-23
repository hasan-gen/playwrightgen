import { describe, expect, it } from "vitest";

import { validateQuickGeneration } from "@/lib/ai/quick-generation";
import { freeToolHandoffSchema } from "@/lib/free-tools/handoff";

describe("quick generation validation", () => {
  it("passes a minimal safe Playwright browser draft", () => {
    const result = validateQuickGeneration(`
import { test, expect } from "@playwright/test";

test("shows the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
`);

    expect(result).toEqual({ status: "PASSED", findings: [] });
  });

  it("blocks unsafe or non-executable output", () => {
    const result = validateQuickGeneration(`
\`\`\`ts
import { readFile } from "node:fs";
test.only("unsafe", async () => eval("2 + 2"));
\`\`\`
`);

    expect(result.status).toBe("BLOCKED");
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "markdown_fence",
        "missing_playwright_import",
        "missing_assertion",
        "focused_test",
        "unsafe_execution",
        "unsafe_node_module",
      ]),
    );
  });

  it("warns about hard waits without falsely blocking otherwise valid code", () => {
    const result = validateQuickGeneration(`
import { test, expect } from "@playwright/test";
test("waits for the result", async ({ page }) => {
  await page.waitForTimeout(1000);
  await expect(page.getByText("Ready")).toBeVisible();
});
`);

    expect(result.status).toBe("WARNINGS");
    expect(result.findings).toContainEqual(expect.objectContaining({ code: "hard_wait" }));
  });
});

describe("free-tool Workspace handoff", () => {
  it("accepts a bounded, explicit draft transition", () => {
    const parsed = freeToolHandoffSchema.safeParse({
      version: 1,
      source: "coverage-review",
      target: "REQUIREMENT",
      createdAt: new Date().toISOString(),
      title: "Quality review follow-up",
      summary: "Review the checkout failure path.",
      acceptanceCriteria: "A declined card shows an actionable error.",
      tags: ["coverage-review"],
      notice: "Human review required.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unbounded or unsupported handoff data", () => {
    const parsed = freeToolHandoffSchema.safeParse({
      version: 1,
      source: "debug-lab",
      target: "AUTOMATION",
      createdAt: "yesterday",
      title: "",
      summary: "x".repeat(50_001),
      acceptanceCriteria: "",
      tags: [],
      notice: "",
    });

    expect(parsed.success).toBe(false);
  });
});
