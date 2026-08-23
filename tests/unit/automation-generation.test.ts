import { describe, expect, it } from "vitest";

import {
  validateAutomationGeneration,
  type AutomationGenerationResult,
} from "@/lib/ai/automation-generation";

const browserResult = (): AutomationGenerationResult => ({
  model: "test-model",
  inputTokens: 10,
  outputTokens: 20,
  totalTokens: 30,
  name: "Checkout browser automation",
  summary: "Verifies successful checkout in the browser.",
  plan: [{
    title: "Complete checkout",
    intent: "Submit valid order details.",
    expectedAssertion: "Order confirmation is visible.",
  }],
  code: `import { test, expect } from "@playwright/test";
test("checkout", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Order confirmed")).toBeVisible();
});`,
  configuration: `import { defineConfig } from "@playwright/test";
export default defineConfig({ use: { baseURL: "http://localhost:3000" } });`,
  dependencies: ["@playwright/test"],
  assumptions: ["The checkout route is /checkout."],
});

describe("automation artifact validation", () => {
  it("accepts a focused Browser artifact using resilient locators", () => {
    expect(validateAutomationGeneration("PLAYWRIGHT_BROWSER", browserResult()))
      .toEqual({ status: "PASSED", findings: [] });
  });

  it("blocks unsafe capabilities, focused tests, and unsupported dependencies", () => {
    const result = browserResult();
    result.code += `\nimport { exec } from "node:child_process";\ntest.only("unsafe", async () => { eval("x") });`;
    result.dependencies.push("shelljs");
    const validation = validateAutomationGeneration("PLAYWRIGHT_BROWSER", result);
    expect(validation.status).toBe("BLOCKED");
    expect(validation.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["focused_test", "unsafe_execution", "unsafe_node_module", "unsupported_dependency"]),
    );
  });

  it("warns about hard waits and brittle locators", () => {
    const result = browserResult();
    result.code = result.code.replace(
      "await page.getByRole(\"button\", { name: \"Place order\" }).click();",
      "await page.locator(\"css=#checkout > button\").click();\n  await page.waitForTimeout(1000);",
    );
    const validation = validateAutomationGeneration("PLAYWRIGHT_BROWSER", result);
    expect(validation.status).toBe("WARNINGS");
    expect(validation.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["hard_wait", "brittle_locator"]),
    );
  });

  it("requires the request fixture for an API artifact", () => {
    const validation = validateAutomationGeneration("PLAYWRIGHT_API", browserResult());
    expect(validation.status).toBe("BLOCKED");
    expect(validation.findings).toContainEqual(expect.objectContaining({
      code: "missing_request_fixture",
    }));
  });
});
