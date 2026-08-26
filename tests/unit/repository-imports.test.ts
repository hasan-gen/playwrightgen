import { describe, expect, it } from "vitest";

import {
  buildRepositoryInventory,
  countPlaywrightTests,
} from "@/lib/services/repository-imports";

describe("repository inventory classification", () => {
  it("classifies Playwright evidence without retaining source bodies", () => {
    const inventory = buildRepositoryInventory({
      externalRepositoryId: "12345",
      commitSha: "a".repeat(40),
      truncated: false,
      files: [
        {
          path: "playwright.config.ts",
          blobSha: "config-sha",
          sizeBytes: 140,
          content: "export default { testDir: './tests' }",
        },
        {
          path: "tests/login.spec.ts",
          blobSha: "spec-sha",
          sizeBytes: 220,
          content: `test("login", async () => {});\ntest.skip("locked", async () => {});`,
        },
        {
          path: "package.json",
          blobSha: "package-sha",
          sizeBytes: 80,
          content: "{}",
        },
        {
          path: ".env",
          blobSha: "secret-sha",
          sizeBytes: 20,
          content: "SECRET=never-store",
        },
      ],
    });

    expect(inventory).toMatchObject({
      configurationCount: 1,
      testFileCount: 1,
      supportFileCount: 1,
      discoveredTestCount: 2,
      limitations: [],
    });
    expect(inventory.files).toHaveLength(3);
    expect(inventory.files.every((file) => !("content" in file))).toBe(true);
    expect(inventory.files.some((file) => file.path === ".env")).toBe(false);
  });

  it("reports explicit limitations instead of inferring trustworthy coverage", () => {
    const inventory = buildRepositoryInventory({
      externalRepositoryId: "12345",
      commitSha: "b".repeat(40),
      truncated: true,
      files: [{
        path: "tests/unknown.spec.ts",
        blobSha: "spec-sha",
        sizeBytes: 50,
      }],
    });

    expect(inventory.discoveredTestCount).toBe(0);
    expect(inventory.limitations).toEqual([
      "playwright_config_missing",
      "repository_tree_truncated",
      "test_content_unavailable",
    ]);
  });

  it("counts executable test declarations but not describe blocks", () => {
    expect(countPlaywrightTests(`
      test.describe("checkout", () => {
        test("works", async () => {});
        it.only("retries", async () => {});
      });
    `)).toBe(2);
  });
});
