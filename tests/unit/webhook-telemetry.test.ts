import { afterEach, describe, expect, it, vi } from "vitest";

import { createWebhookResponder } from "@/lib/operations/webhook-telemetry";

describe("safe webhook telemetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a request ID without logging response or payload content", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = createWebhookResponder("github-webhook").json(
      { status: "ok", rawSecret: "must-not-be-logged" },
      { code: "applied" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");

    const logLine = String(info.mock.calls[0]?.[0]);
    expect(logLine).toContain('"event":"webhook.delivery"');
    expect(logLine).toContain('"surface":"github-webhook"');
    expect(logLine).not.toContain("must-not-be-logged");
  });

  it("classifies server failures without logging raw errors", () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = createWebhookResponder("stripe-webhook").json(
      { status: "error", error: "provider detail" },
      { status: 500, code: "synchronization_failed" },
    );

    expect(response.status).toBe(500);
    const logLine = String(error.mock.calls[0]?.[0]);
    expect(logLine).toContain('"status":"failed"');
    expect(logLine).not.toContain("provider detail");
  });
});
