import { describe, expect, it } from "vitest";

import { legacyAiRouteQuarantine } from "@/lib/operations/legacy-ai-route";

describe("legacy AI route quarantine", () => {
  it("returns a safe retirement response by default", async () => {
    const response = legacyAiRouteQuarantine({
      replacement: "/api/quick-generate",
      source: {},
    });

    expect(response?.status).toBe(410);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(response?.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    await expect(response?.json()).resolves.toMatchObject({
      code: "legacy_endpoint_quarantined",
      replacement: "/api/quick-generate",
    });
  });

  it("allows an explicit temporary migration override", () => {
    expect(
      legacyAiRouteQuarantine({
        replacement: "/api/quick-generate",
        source: { ENABLE_LEGACY_AI_ROUTES: "true" },
      }),
    ).toBeNull();
  });
});
