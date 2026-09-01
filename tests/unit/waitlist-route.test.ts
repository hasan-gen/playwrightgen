import { afterEach, describe, expect, it, vi } from "vitest";

import { handleWaitlistRequest } from "@/app/api/waitlist/route";

function request(body: unknown, ip = "203.0.113.10") {
  return new Request("https://playwrightgen.example/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const environment = {
  RATE_LIMIT_HASH_SECRET: "waitlist-rate-limit-secret-for-tests",
  RESEND_API_KEY: "",
  UPSTASH_REDIS_REST_TOKEN: "redis-token-for-tests-that-is-long-enough",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  WAITLIST_NOTIFY_EMAIL: "",
};

describe("public team waitlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stores a normalized address with retention cleanup", async () => {
    Object.entries(environment).forEach(([name, value]) => vi.stubEnv(name, value));
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const store = {
      set: vi.fn().mockResolvedValue("OK"),
      zremrangebyscore: vi.fn().mockResolvedValue(0),
      zadd: vi.fn().mockResolvedValue(1),
    };
    const notify = vi.fn().mockResolvedValue(undefined);

    const response = await handleWaitlistRequest(
      request({ email: "  PERSON@Example.com " }),
      {
        createStore: () => store,
        notify,
        now: () => Date.parse("2026-09-01T12:00:00.000Z"),
      },
    );

    expect(response.status).toBe(200);
    expect(store.zadd).toHaveBeenCalledWith(
      "playwrightgen:waitlist:v2",
      expect.objectContaining({ member: "person@example.com" }),
    );
    expect(store.zremrangebyscore).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects a repeated client before storing another address", async () => {
    Object.entries(environment).forEach(([name, value]) => vi.stubEnv(name, value));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = {
      set: vi.fn().mockResolvedValue(null),
      zremrangebyscore: vi.fn(),
      zadd: vi.fn(),
    };

    const response = await handleWaitlistRequest(
      request({ email: "person@example.com" }),
      {
        createStore: () => store,
        notify: vi.fn(),
        now: () => 0,
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(store.zadd).not.toHaveBeenCalled();
  });

  it("does not expose provider failures or submitted email in logs", async () => {
    Object.entries(environment).forEach(([name, value]) => vi.stubEnv(name, value));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleWaitlistRequest(
      request({ email: "private@example.com" }),
      {
        createStore: () => {
          throw new Error("provider credential detail");
        },
        notify: vi.fn(),
        now: () => 0,
      },
    );

    expect(response.status).toBe(503);
    const logLine = String(error.mock.calls[0]?.[0]);
    expect(logLine).not.toContain("private@example.com");
    expect(logLine).not.toContain("provider credential detail");
  });
});
