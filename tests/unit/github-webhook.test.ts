import { createHmac } from "node:crypto";

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { handleGitHubWebhookRequest } from "@/app/api/webhooks/github/route";
import {
  sha256WebhookPayload,
  verifyGitHubWebhookSignature,
} from "@/lib/integrations/github/webhook-signature";
import {
  GitHubWebhookPayloadError,
  parseVerifiedGitHubWebhook,
} from "@/lib/validation/github-webhook";

const secret = "github-webhook-test-secret";

function signature(body: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function request(body: string, signatureValue = signature(body)) {
  return new NextRequest("http://localhost/api/webhooks/github", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-github-delivery": "123e4567-e89b-12d3-a456-426614174000",
      "x-github-event": "installation",
      "x-hub-signature-256": signatureValue,
    },
  });
}

const installationPayload = {
  action: "suspend",
  installation: {
    id: 123456,
    account: { id: 987654, login: "acme-quality", type: "Organization" },
    repository_selection: "selected",
    updated_at: "2026-08-26T12:00:00.000Z",
    suspended_at: "2026-08-26T12:00:00.000Z",
  },
};

describe("GitHub webhook verification", () => {
  it("validates the exact UTF-8 body with HMAC-SHA256", () => {
    const body = JSON.stringify({ greeting: "quality \u2713" });
    expect(verifyGitHubWebhookSignature({
      secret,
      rawBody: body,
      signature: signature(body),
    })).toBe(true);
    expect(verifyGitHubWebhookSignature({
      secret,
      rawBody: `${body} `,
      signature: signature(body),
    })).toBe(false);
    expect(verifyGitHubWebhookSignature({
      secret,
      rawBody: body,
      signature: "sha256=invalid",
    })).toBe(false);
  });

  it("normalizes only supported installation fields", () => {
    expect(parseVerifiedGitHubWebhook({
      eventName: "installation",
      payload: { ...installationPayload, private_marker: "never-store" },
    })).toEqual({
      kind: "event",
      event: {
        kind: "installation",
        action: "suspend",
        externalInstallationId: "123456",
        accountId: "987654",
        accountLogin: "acme-quality",
        accountType: "Organization",
        repositorySelection: "selected",
        providerUpdatedAt: new Date("2026-08-26T12:00:00.000Z"),
        providerSuspendedAt: new Date("2026-08-26T12:00:00.000Z"),
      },
    });
  });

  it("ignores unsupported events and rejects malformed supported events", () => {
    expect(parseVerifiedGitHubWebhook({
      eventName: "ping",
      payload: { zen: "Keep it logically awesome." },
    })).toEqual({ kind: "ignored", action: "unknown" });
    expect(() => parseVerifiedGitHubWebhook({
      eventName: "installation",
      payload: { action: "deleted", installation: { id: "bad" } },
    })).toThrow(GitHubWebhookPayloadError);
  });
});

describe("GitHub webhook route boundary", () => {
  it("rejects an invalid signature before dispatch", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = secret;
    const dispatch = vi.fn();
    const response = await handleGitHubWebhookRequest(
      request(JSON.stringify(installationPayload), `sha256=${"0".repeat(64)}`),
      {
        verifySignature: verifyGitHubWebhookSignature,
        hashPayload: sha256WebhookPayload,
        dispatch,
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      status: "error",
      code: "invalid_signature",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches verified JSON with delivery identity and digest", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = secret;
    const body = JSON.stringify(installationPayload);
    const dispatch = vi.fn(async () => ({ status: "applied" as const }));
    const response = await handleGitHubWebhookRequest(request(body), {
      verifySignature: verifyGitHubWebhookSignature,
      hashPayload: sha256WebhookPayload,
      dispatch,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", result: "applied" });
    expect(dispatch).toHaveBeenCalledWith({
      eventName: "installation",
      deliveryId: "123e4567-e89b-12d3-a456-426614174000",
      payloadSha256: sha256WebhookPayload(body),
      payload: installationPayload,
    });
  });

  it("does not expose internal synchronization failures", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = secret;
    const body = JSON.stringify(installationPayload);
    const response = await handleGitHubWebhookRequest(request(body), {
      verifySignature: verifyGitHubWebhookSignature,
      hashPayload: sha256WebhookPayload,
      dispatch: async () => {
        throw new Error("private-provider-marker");
      },
    });
    const responseBody = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(responseBody).toContain("synchronization_failed");
    expect(responseBody).not.toContain("private-provider-marker");
  });
});
