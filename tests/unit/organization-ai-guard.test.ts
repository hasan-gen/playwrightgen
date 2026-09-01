import { describe, expect, it, vi } from "vitest";

import { reserveOrganizationAiRequest } from "@/lib/operations/organization-ai-guard";

const organizationId = "11111111-1111-4111-8111-111111111111";
const source = {
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "redis-test-token-that-is-long-enough",
};

describe("organization AI guard", () => {
  it("reserves organization quota before a provider call", async () => {
    const execute = vi.fn().mockResolvedValue([1, 1, 7, 0]);
    const result = await reserveOrganizationAiRequest({
      organizationId,
      surface: "requirement-review",
      source,
      now: new Date("2026-08-31T12:34:00.000Z"),
      execute,
    });

    expect(execute).toHaveBeenCalledWith(
      [
        `playwrightgen:organization-ai:${organizationId}:minute`,
        `playwrightgen:organization-ai:${organizationId}:day:2026-08-31`,
      ],
      ["4", "20", "60", "41160"],
    );
    expect(result).toMatchObject({ dailyRemaining: 13, minuteRemaining: 3 });
  });

  it("rejects an exhausted daily organization budget", async () => {
    await expect(
      reserveOrganizationAiRequest({
        organizationId,
        surface: "automation-generation",
        source,
        execute: vi.fn().mockResolvedValue([0, 2, 20, 2]),
      }),
    ).rejects.toMatchObject({ code: "organization_daily_limit" });
  });
});
