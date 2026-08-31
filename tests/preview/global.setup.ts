import path from "node:path";

import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

setup.describe.configure({ mode: "serial" });

const authFile = path.resolve("playwright/.clerk/preview-owner.json");

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for authenticated Preview checks.`);
  }
  return value;
}

setup("obtain a Clerk testing token", async () => {
  await clerkSetup({
    publishableKey: requiredEnvironment("CLERK_PUBLISHABLE_KEY"),
    secretKey: requiredEnvironment("CLERK_SECRET_KEY"),
  });
});

setup("authenticate the dedicated Preview test principal", async ({ page }) => {
  const secretKey = requiredEnvironment("CLERK_SECRET_KEY");
  const emailAddress = requiredEnvironment("E2E_CLERK_USER_EMAIL");
  const organizationSlug = requiredEnvironment("E2E_ORGANIZATION_SLUG");
  const clerkClient = createClerkClient({ secretKey });
  const organization = await clerkClient.organizations.getOrganization({
    slug: organizationSlug,
  });
  const users = await clerkClient.users.getUserList({
    emailAddress: [emailAddress],
    limit: 2,
  });

  if (users.data.length !== 1) {
    throw new Error(
      "The dedicated Preview test principal must resolve to exactly one Clerk user.",
    );
  }

  const memberships =
    await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: organization.id,
      userId: [users.data[0].id],
      limit: 2,
    });
  if (memberships.data.length !== 1) {
    throw new Error(
      "The dedicated Preview test principal must be an organization member.",
    );
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await clerk.signIn({ page, emailAddress });
  await page.evaluate(async (organizationId) => {
    await window.Clerk.setActive({ organization: organizationId });
  }, organization.id);
  await page.goto(`/workspace/${encodeURIComponent(organizationSlug)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();
  await page.context().storageState({ path: authFile });
});
