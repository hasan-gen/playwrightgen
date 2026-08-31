import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  dispatchStripeWebhook,
  StripeWebhookConflictError,
} from "@/lib/services/billing";
import {
  cleanPhase1ATables,
  connectTestDatabase,
  createTestPrismaClient,
  disconnectTestDatabase,
} from "@/tests/helpers/database";

const unique = (prefix: string) => `${prefix}-${randomUUID()}`;
const digest = (character: string) => character.repeat(64);
const teamPriceId = "price_team_test";

describe("organization-scoped billing synchronization", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    await connectTestDatabase(prisma);
  });
  beforeEach(async () => cleanPhase1ATables(prisma));
  afterAll(async () => {
    if (prisma) {
      await cleanPhase1ATables(prisma);
      await disconnectTestDatabase(prisma);
    }
  });

  async function organization() {
    return prisma.organization.create({
      data: {
        clerkOrganizationId: unique("org"),
        name: "Billing workspace",
        slug: unique("billing"),
      },
    });
  }

  function subscriptionWebhook(input: {
    organizationId: string;
    eventId?: string;
    customerId?: string;
    subscriptionId?: string;
    status?: "active" | "canceled" | "past_due";
    priceId?: string;
    payloadSha256?: string;
    eventCreatedAt?: Date;
  }) {
    return {
      kind: "subscription" as const,
      stripeEventId: input.eventId ?? unique("evt"),
      payloadSha256: input.payloadSha256 ?? digest("a"),
      eventType: "customer.subscription.updated",
      livemode: false,
      eventCreatedAt:
        input.eventCreatedAt ?? new Date("2026-08-31T19:00:00.000Z"),
      organizationId: input.organizationId,
      customerId: input.customerId ?? unique("cus"),
      subscriptionId: input.subscriptionId ?? unique("sub"),
      priceId: input.priceId ?? teamPriceId,
      status: input.status ?? "active",
      quantity: 1,
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date("2026-08-31T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-09-30T00:00:00.000Z"),
      trialEnd: null,
    };
  }

  it("materializes a Team subscription and organization entitlements", async () => {
    const workspace = await organization();
    const webhook = subscriptionWebhook({ organizationId: workspace.id });

    await expect(
      dispatchStripeWebhook({ webhook, teamPriceId, prisma }),
    ).resolves.toEqual({ status: "applied" });

    const subscription = await prisma.billingSubscription.findUniqueOrThrow({
      where: { stripeSubscriptionId: webhook.subscriptionId },
    });
    expect(subscription).toMatchObject({
      organizationId: workspace.id,
      plan: "TEAM",
      status: "ACTIVE",
      stripePriceId: teamPriceId,
    });
    expect(
      await prisma.organizationEntitlement.findMany({
        where: { organizationId: workspace.id },
        orderBy: { key: "asc" },
        select: { key: true, enabled: true, source: true },
      }),
    ).toEqual([
      { key: "ai.workflows", enabled: true, source: "SUBSCRIPTION" },
      { key: "repository.import", enabled: true, source: "SUBSCRIPTION" },
      { key: "workspace.team", enabled: true, source: "SUBSCRIPTION" },
    ]);
    expect(
      await prisma.activity.count({
        where: { organizationId: workspace.id, source: "STRIPE_WEBHOOK" },
      }),
    ).toBe(2);
  });

  it("is idempotent and rejects reuse of an event ID with another digest", async () => {
    const workspace = await organization();
    const webhook = subscriptionWebhook({ organizationId: workspace.id });

    await dispatchStripeWebhook({ webhook, teamPriceId, prisma });
    await expect(
      dispatchStripeWebhook({ webhook, teamPriceId, prisma }),
    ).resolves.toEqual({ status: "duplicate" });
    await expect(
      dispatchStripeWebhook({
        webhook: { ...webhook, payloadSha256: digest("b") },
        teamPriceId,
        prisma,
      }),
    ).rejects.toBeInstanceOf(StripeWebhookConflictError);
    expect(await prisma.billingSubscription.count()).toBe(1);
  });

  it("revokes subscription entitlements when no active Team plan remains", async () => {
    const workspace = await organization();
    const customerId = unique("cus");
    const subscriptionId = unique("sub");
    await dispatchStripeWebhook({
      webhook: subscriptionWebhook({
        organizationId: workspace.id,
        customerId,
        subscriptionId,
      }),
      teamPriceId,
      prisma,
    });
    await dispatchStripeWebhook({
      webhook: subscriptionWebhook({
        organizationId: workspace.id,
        eventId: unique("evt"),
        payloadSha256: digest("c"),
        customerId,
        subscriptionId,
        status: "canceled",
      }),
      teamPriceId,
      prisma,
      now: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(
      await prisma.organizationEntitlement.count({
        where: { organizationId: workspace.id, enabled: true },
      }),
    ).toBe(0);
  });

  it("ignores an older lifecycle event instead of restoring stale access", async () => {
    const workspace = await organization();
    const customerId = unique("cus");
    const subscriptionId = unique("sub");
    await dispatchStripeWebhook({
      webhook: subscriptionWebhook({
        organizationId: workspace.id,
        customerId,
        subscriptionId,
        status: "canceled",
        eventCreatedAt: new Date("2026-09-02T19:00:00.000Z"),
      }),
      teamPriceId,
      prisma,
    });

    await expect(
      dispatchStripeWebhook({
        webhook: subscriptionWebhook({
          organizationId: workspace.id,
          eventId: unique("evt"),
          payloadSha256: digest("e"),
          customerId,
          subscriptionId,
          status: "active",
          eventCreatedAt: new Date("2026-09-01T19:00:00.000Z"),
        }),
        teamPriceId,
        prisma,
      }),
    ).resolves.toEqual({ status: "ignored" });

    expect(
      await prisma.billingSubscription.findUniqueOrThrow({
        where: { stripeSubscriptionId: subscriptionId },
        select: { status: true },
      }),
    ).toEqual({ status: "CANCELED" });
    expect(
      await prisma.organizationEntitlement.count({
        where: { organizationId: workspace.id, enabled: true },
      }),
    ).toBe(0);
  });

  it("never attaches a Stripe customer to a second organization", async () => {
    const first = await organization();
    const second = await organization();
    const customerId = unique("cus");
    await dispatchStripeWebhook({
      webhook: subscriptionWebhook({ organizationId: first.id, customerId }),
      teamPriceId,
      prisma,
    });

    await expect(
      dispatchStripeWebhook({
        webhook: subscriptionWebhook({
          organizationId: second.id,
          eventId: unique("evt"),
          payloadSha256: digest("d"),
          customerId,
        }),
        teamPriceId,
        prisma,
      }),
    ).rejects.toMatchObject({ code: "stripe_customer_scope_mismatch" });
  });

  it("records an unknown price without granting access", async () => {
    const workspace = await organization();
    await expect(
      dispatchStripeWebhook({
        webhook: subscriptionWebhook({
          organizationId: workspace.id,
          priceId: "price_unknown",
        }),
        teamPriceId,
        prisma,
      }),
    ).resolves.toEqual({ status: "ignored" });
    expect(await prisma.billingSubscription.count()).toBe(0);
    expect(await prisma.organizationEntitlement.count()).toBe(0);
  });
});
