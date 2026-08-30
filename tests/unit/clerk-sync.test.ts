import { Buffer } from "node:buffer";

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { Webhook } from "standardwebhooks";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { handleClerkWebhookRequest } from "@/app/api/webhooks/clerk/route";
import { buildSyncActivityMetadata } from "@/lib/services/activity";
import {
  decideEventApplication,
  mapClerkOrganizationRole,
  shouldBootstrapOwner,
} from "@/lib/services/clerk-sync";
import {
  ClerkWebhookPayloadError,
  normalizeDisplayName,
  normalizeProviderTimestamp,
  parseVerifiedClerkWebhook,
  selectPrimaryEmail,
} from "@/lib/validation/clerk-webhook";
import { clerkUserData } from "@/tests/helpers/clerk";

const originalWebhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
const testWebhookSecret = `whsec_${Buffer.alloc(32, 7).toString("base64")}`;

afterEach(() => {
  if (originalWebhookSecret === undefined) {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  } else {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalWebhookSecret;
  }
});

function signedRequest(payload: object) {
  const body = JSON.stringify(payload);
  const messageId = "event_signed_fixture";
  const timestamp = new Date();
  const signature = new Webhook(testWebhookSecret).sign(
    messageId,
    timestamp,
    body,
  );

  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": messageId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  });
}

describe("Clerk synchronization mappings", () => {
  it("maps only installed default organization roles", () => {
    expect(mapClerkOrganizationRole("org:admin")).toBe("ADMIN");
    expect(mapClerkOrganizationRole("org:member")).toBe("MEMBER");
    expect(() => mapClerkOrganizationRole("org:custom")).toThrow(
      ClerkWebhookPayloadError,
    );
  });

  it("selects only the provider-designated primary email", () => {
    const addresses = [
      { id: "email_secondary", emailAddress: "secondary@example.test" },
      { id: "email_primary", emailAddress: "primary@example.test" },
    ];
    expect(
      selectPrimaryEmail({
        primaryEmailAddressId: "email_primary",
        emailAddresses: addresses,
      }),
    ).toBe("primary@example.test");
    expect(
      selectPrimaryEmail({
        primaryEmailAddressId: null,
        emailAddresses: addresses,
      }),
    ).toBeNull();
  });

  it("normalizes display names without inventing identity data", () => {
    expect(
      normalizeDisplayName({ firstName: " Ada ", lastName: " Lovelace " }),
    ).toBe("Ada Lovelace");
    expect(
      normalizeDisplayName({ firstName: " محمدجان ", lastName: "�broken" }),
    ).toBe("محمدجان");
    expect(
      normalizeDisplayName({ firstName: "�broken", username: " engineer " }),
    ).toBe("engineer");
    expect(normalizeDisplayName({ username: " engineer " })).toBe("engineer");
    expect(normalizeDisplayName({})).toBeNull();
  });

  it("normalizes provider timestamps as milliseconds", () => {
    const milliseconds = 1_700_000_000_123;
    expect(normalizeProviderTimestamp(milliseconds).getTime()).toBe(
      milliseconds,
    );
    expect(() => normalizeProviderTimestamp(Number.NaN)).toThrow(
      ClerkWebhookPayloadError,
    );
  });

  it("detects duplicate and stale events", () => {
    expect(
      decideEventApplication({
        existingEventId: "event_same",
        existingUpdatedAt: new Date(2000),
        incomingEventId: "event_same",
        incomingUpdatedAt: new Date(2000),
      }),
    ).toBe("duplicate");
    expect(
      decideEventApplication({
        existingEventId: "event_new",
        existingUpdatedAt: new Date(2000),
        incomingEventId: "event_old",
        incomingUpdatedAt: new Date(1000),
      }),
    ).toBe("stale");
    expect(
      decideEventApplication({
        existingEventId: "event_first",
        existingUpdatedAt: new Date(2000),
        incomingEventId: "event_equivalent",
        incomingUpdatedAt: new Date(2000),
      }),
    ).toBe("applied");
  });

  it("builds PII-safe Activity metadata", () => {
    const metadata = buildSyncActivityMetadata({
      eventType: "organizationMembership.updated",
      eventId: "event_fixture",
      changedFields: ["role", "status", "role"],
      previousStatus: "REMOVED",
      newStatus: "ACTIVE",
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata.changedFields).toEqual(["role", "status"]);
    expect(serialized).not.toMatch(/email|avatar|displayName|payload|token|secret/i);
  });

  it("ignores unknown verified event types", () => {
    expect(
      parseVerifiedClerkWebhook({
        type: "session.created",
        data: {},
        eventId: "event_ignored",
      }),
    ).toEqual({ kind: "ignored" });
  });

  it("rejects malformed required identifiers", () => {
    expect(() =>
      parseVerifiedClerkWebhook({
        type: "user.created",
        data: clerkUserData({ id: "" }),
        eventId: "event_invalid",
      }),
    ).toThrow(ClerkWebhookPayloadError);
  });

  it("bootstraps Owner only from exact verified creator evidence", () => {
    expect(
      shouldBootstrapOwner({
        creatorUserId: "user_creator",
        membershipUserId: "user_creator",
        activeOwnerCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldBootstrapOwner({
        creatorUserId: null,
        membershipUserId: "user_creator",
        activeOwnerCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldBootstrapOwner({
        creatorUserId: "user_creator",
        membershipUserId: "user_other",
        activeOwnerCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldBootstrapOwner({
        creatorUserId: "user_creator",
        membershipUserId: "user_creator",
        activeOwnerCount: 1,
      }),
    ).toBe(false);
  });
});

describe("Clerk webhook route boundary", () => {
  it("fails safely when the signing secret is missing", async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const verify = vi.fn<typeof verifyWebhook>();
    const response = await handleClerkWebhookRequest(
      new NextRequest("http://localhost/api/webhooks/clerk", {
        method: "POST",
      }),
      {
        verify,
        dispatch: vi.fn(),
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      status: "error",
      code: "webhook_unavailable",
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = testWebhookSecret;
    const response = await handleClerkWebhookRequest(
      new NextRequest("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ type: "session.created", data: {} }),
        headers: {
          "svix-id": "event_invalid_signature",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": "v1,invalid",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      status: "error",
      code: "invalid_signature",
    });
  });

  it("cryptographically verifies and ignores an unsupported event", async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = testWebhookSecret;
    const response = await handleClerkWebhookRequest(
      signedRequest({
        type: "session.created",
        data: { id: "session_fixture" },
        event_attributes: {
          http_request: { client_ip: "0.0.0.0", user_agent: "test" },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      result: "ignored",
    });
  });

  it("passes the verified envelope timestamp to deletion synchronization", async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = testWebhookSecret;
    const eventTimestamp = 1_700_000_000_123;
    const dispatch = vi.fn(async () => ({ status: "applied" as const }));
    const response = await handleClerkWebhookRequest(
      signedRequest({
        type: "user.deleted",
        data: { id: "user_deleted_fixture", deleted: true },
        object: "event",
        timestamp: eventTimestamp,
        event_attributes: {
          http_request: { client_ip: "0.0.0.0", user_agent: "test" },
        },
      }),
      { verify: verifyWebhook, dispatch },
    );

    expect(response.status).toBe(200);
    expect(dispatch).toHaveBeenCalledWith({
      type: "user.deleted",
      data: { id: "user_deleted_fixture", deleted: true },
      eventId: "event_signed_fixture",
      eventTimestamp,
    });
  });

  it("returns a sanitized response when synchronization fails", async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = testWebhookSecret;
    const privateMarker = "private-payload-marker";
    const response = await handleClerkWebhookRequest(
      signedRequest({ type: "session.created", data: {} }),
      {
        verify: async () =>
          ({
            type: "session.created",
            object: "event",
            data: {},
            event_attributes: {
              http_request: { client_ip: "0.0.0.0", user_agent: "test" },
            },
          }) as Awaited<ReturnType<typeof verifyWebhook>>,
        dispatch: async () => {
          throw new Error(privateMarker);
        },
      },
    );
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).toContain("synchronization_failed");
    expect(body).not.toContain(privateMarker);
  });
});
