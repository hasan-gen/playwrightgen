import { expect, test } from "@playwright/test";

test("public quality workflow surfaces remain reachable", async ({ page }) => {
  test.setTimeout(180_000);
  const open = (path: string) =>
    page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });

  await open("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quick Generate", exact: true }),
  ).toBeVisible();

  await open("/generator");
  await expect(page.getByRole("heading", { name: /reviewable playwright draft/i })).toBeVisible();

  await open("/intelligence");
  await expect(page.getByRole("heading", { name: /quality gap/i })).toBeVisible();

  await open("/pricing");
  await expect(page.getByRole("heading", { name: /start free/i })).toBeVisible();
});
