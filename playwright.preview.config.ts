import { defineConfig, devices } from "@playwright/test";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for authenticated Preview checks.`);
  }
  return value;
}

const baseURL = requiredEnvironment("PLAYWRIGHT_PREVIEW_BASE_URL");
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

export default defineConfig({
  testDir: "./tests/preview",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    extraHTTPHeaders: protectionBypass
      ? {
          "x-vercel-protection-bypass": protectionBypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
  },
  projects: [
    {
      name: "Clerk setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "Authenticated Preview",
      testMatch: /authenticated-preview\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.clerk/preview-owner.json",
      },
      dependencies: ["Clerk setup"],
    },
  ],
});
