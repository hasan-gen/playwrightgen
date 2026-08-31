import { expect, test } from "@playwright/test";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for authenticated Preview checks.`);
  }
  return value;
}

const organizationSlug = requiredEnvironment("E2E_ORGANIZATION_SLUG");

test("authenticated Workspace surfaces and exact-ref evidence are readable", async ({
  page,
}) => {
  await page.goto(`/workspace/${encodeURIComponent(organizationSlug)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();

  const projectLink = page
    .locator(`a[href^="/workspace/${organizationSlug}/projects/"]`)
    .filter({ hasText: "PlaywrightGen" })
    .first();
  const qualityPath = await projectLink.getAttribute("href");
  expect(qualityPath).toMatch(
    new RegExp(`^/workspace/${organizationSlug}/projects/[^/]+/quality$`),
  );
  const projectPath = qualityPath!.replace(/\/quality$/, "");

  const surfaces = [
    ["quality", "Quality Command Center"],
    ["overview", "PlaywrightGen"],
    ["requirements", "Requirements"],
    ["test-cases", "Test Cases"],
    ["automation", "Automation Studio"],
    ["repositories", "Connect tests to their source"],
    ["test-runs", "Test Runs"],
  ] as const;

  for (const [path, heading] of surfaces) {
    const response = await page.goto(`${projectPath}/${path}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), `${path} returned an error status`).toBeLessThan(
      400,
    );
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
  }

  await page.goto(`${projectPath}/repositories`, {
    waitUntil: "domcontentloaded",
  });
  const repository = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "hasan-gen/playwrightgen",
      exact: true,
    }),
  });
  await expect(repository.getByText("succeeded", { exact: true })).toBeVisible();
  await expect(
    repository.getByText("hasan_genai@58814e3a", { exact: true }),
  ).toBeVisible();

  const expectedMetrics = [
    ["Configs", "1"],
    ["Spec files", "24"],
    ["Test declarations", "190"],
    ["Support files", "3"],
  ] as const;
  for (const [label, value] of expectedMetrics) {
    const metric = repository.locator("dl > div").filter({ hasText: label });
    await expect(metric.getByText(value, { exact: true })).toBeVisible();
  }
});

test("authenticated tenant boundaries fail closed", async ({ request }) => {
  const validProjectId = requiredEnvironment("E2E_PROJECT_ID");
  const missingProjectId = "00000000-0000-4000-8000-000000000000";

  const missingProject = await request.get(
    `/api/github/setup/start?orgSlug=${encodeURIComponent(organizationSlug)}&projectId=${missingProjectId}`,
    { maxRedirects: 0 },
  );
  expect(missingProject.status()).toBe(404);
  await expect(missingProject.json()).resolves.toEqual({
    status: "error",
    code: "workspace_not_found",
  });

  const wrongOrganization = await request.get(
    `/api/github/setup/start?orgSlug=not-${encodeURIComponent(organizationSlug)}&projectId=${encodeURIComponent(validProjectId)}`,
    { maxRedirects: 0 },
  );
  expect(wrongOrganization.status()).toBe(404);
  await expect(wrongOrganization.json()).resolves.toEqual({
    status: "error",
    code: "workspace_not_found",
  });
});
