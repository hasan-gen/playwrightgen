import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

const uuid = z.string().uuid();
const stripeId = z.string().trim().min(3).max(255);
const payloadSha256 = z.string().regex(/^[0-9a-f]{64}$/);
const eventType = z.string().trim().min(1).max(100);
const stripeStatus = z.enum([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

const teamEntitlements = [
  "workspace.team",
  "repository.import",
  "ai.workflows",
] as const;

type StripeWebhookBase = {
  stripeEventId: string;
  payloadSha256: string;
  eventType: string;
  livemode: boolean;
  eventCreatedAt: Date;
};

export type NormalizedStripeWebhook = StripeWebhookBase &
  (
    | { kind: "ignored"; externalObjectId?: string }
    | {
        kind: "checkout";
        organizationId: string;
        customerId: string;
        checkoutSessionId: string;
      }
    | {
        kind: "subscription";
        organizationId: string;
        customerId: string;
        subscriptionId: string;
        priceId: string;
        status: z.infer<typeof stripeStatus>;
        quantity: number;
        cancelAtPeriodEnd: boolean;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialEnd: Date | null;
      }
  );

export type StripeWebhookResult = {
  status: "applied" | "duplicate" | "ignored";
};

export class StripeWebhookConflictError extends Error {
  readonly code: string;

  constructor(code = "stripe_webhook_conflict") {
    super(code);
    this.name = "StripeWebhookConflictError";
    this.code = code;
  }
}

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function runSerializable<T>(
  client: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await client.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error: unknown) {
      if (!isPrismaCode(error, "P2034") || attempt === 2) throw error;
    }
  }
  throw new Error("Stripe synchronization transaction retry exhausted.");
}

function parseWebhook(input: NormalizedStripeWebhook): NormalizedStripeWebhook {
  const base = {
    stripeEventId: stripeId.parse(input.stripeEventId),
    payloadSha256: payloadSha256.parse(input.payloadSha256),
    eventType: eventType.parse(input.eventType),
    livemode: z.boolean().parse(input.livemode),
    eventCreatedAt: z.date().parse(input.eventCreatedAt),
  };
  if (input.kind === "ignored") {
    return {
      ...base,
      kind: "ignored",
      externalObjectId: input.externalObjectId
        ? stripeId.parse(input.externalObjectId)
        : undefined,
    };
  }
  const scoped = {
    organizationId: uuid.parse(input.organizationId),
    customerId: stripeId.parse(input.customerId),
  };
  if (input.kind === "checkout") {
    return {
      ...base,
      ...scoped,
      kind: "checkout",
      checkoutSessionId: stripeId.parse(input.checkoutSessionId),
    };
  }
  return {
    ...base,
    ...scoped,
    kind: "subscription",
    subscriptionId: stripeId.parse(input.subscriptionId),
    priceId: stripeId.parse(input.priceId),
    status: stripeStatus.parse(input.status),
    quantity: z.number().int().positive().parse(input.quantity),
    cancelAtPeriodEnd: z.boolean().parse(input.cancelAtPeriodEnd),
    currentPeriodStart: z.date().nullable().parse(input.currentPeriodStart),
    currentPeriodEnd: z.date().nullable().parse(input.currentPeriodEnd),
    trialEnd: z.date().nullable().parse(input.trialEnd),
  };
}

function toDatabaseStatus(status: z.infer<typeof stripeStatus>) {
  return status.toUpperCase() as
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED"
    | "UNPAID"
    | "PAUSED";
}

async function duplicateResult(
  transaction: Prisma.TransactionClient,
  input: NormalizedStripeWebhook,
): Promise<StripeWebhookResult | null> {
  const existing = await transaction.stripeWebhookDelivery.findUnique({
    where: { stripeEventId: input.stripeEventId },
  });
  if (!existing) return null;
  if (existing.payloadSha256 !== input.payloadSha256) {
    throw new StripeWebhookConflictError("stripe_event_digest_mismatch");
  }
  return { status: "duplicate" };
}

async function resolveBillingAccount(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  customerId: string,
) {
  const organization = await transaction.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) {
    throw new StripeWebhookConflictError("stripe_organization_not_found");
  }
  const byCustomer = await transaction.organizationBillingAccount.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (byCustomer && byCustomer.organizationId !== organizationId) {
    throw new StripeWebhookConflictError("stripe_customer_scope_mismatch");
  }
  const account = await transaction.organizationBillingAccount.upsert({
    where: { organizationId },
    create: { organizationId, stripeCustomerId: customerId },
    update: {},
  });
  if (account.stripeCustomerId && account.stripeCustomerId !== customerId) {
    throw new StripeWebhookConflictError("stripe_customer_scope_mismatch");
  }
  if (!account.stripeCustomerId) {
    return transaction.organizationBillingAccount.update({
      where: { id: account.id },
      data: { stripeCustomerId: customerId },
    });
  }
  return account;
}

async function synchronizeEntitlements(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  fallbackSubscriptionId: string,
  now: Date,
) {
  const activeSubscription = await transaction.billingSubscription.findFirst({
    where: {
      organizationId,
      plan: "TEAM",
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    orderBy: [{ currentPeriodEnd: "desc" }, { updatedAt: "desc" }],
  });
  const enabled = Boolean(activeSubscription);
  const sourceSubscriptionId =
    activeSubscription?.id ?? fallbackSubscriptionId;

  for (const key of teamEntitlements) {
    const existing = await transaction.organizationEntitlement.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
    if (existing?.source === "MANUAL_OVERRIDE") continue;
    await transaction.organizationEntitlement.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: {
        organizationId,
        key,
        enabled,
        source: "SUBSCRIPTION",
        sourceSubscriptionId,
        effectiveFrom: now,
        effectiveUntil: enabled ? null : now,
      },
      update: {
        enabled,
        source: "SUBSCRIPTION",
        sourceSubscriptionId,
        effectiveFrom: enabled ? now : existing?.effectiveFrom ?? now,
        effectiveUntil: enabled ? null : now,
      },
    });
  }

  return { enabled, keys: [...teamEntitlements] };
}

export async function dispatchStripeWebhook(input: {
  webhook: NormalizedStripeWebhook;
  teamPriceId: string;
  prisma?: PrismaClient;
  now?: Date;
}): Promise<StripeWebhookResult> {
  const webhook = parseWebhook(input.webhook);
  const teamPriceId = stripeId.parse(input.teamPriceId);
  const prisma = input.prisma ?? getPrismaClient();
  const now = input.now ?? new Date();

  try {
    return await runSerializable(prisma, async (transaction) => {
      const duplicate = await duplicateResult(transaction, webhook);
      if (duplicate) return duplicate;

      if (webhook.kind === "ignored") {
        await transaction.stripeWebhookDelivery.create({
          data: {
            stripeEventId: webhook.stripeEventId,
            payloadSha256: webhook.payloadSha256,
            eventType: webhook.eventType,
            externalObjectId: webhook.externalObjectId ?? null,
            livemode: webhook.livemode,
            result: "IGNORED",
            processedAt: now,
          },
        });
        return { status: "ignored" };
      }

      const account = await resolveBillingAccount(
        transaction,
        webhook.organizationId,
        webhook.customerId,
      );

      if (webhook.kind === "checkout") {
        await transaction.stripeWebhookDelivery.create({
          data: {
            stripeEventId: webhook.stripeEventId,
            payloadSha256: webhook.payloadSha256,
            eventType: webhook.eventType,
            externalObjectId: webhook.checkoutSessionId,
            livemode: webhook.livemode,
            organizationId: webhook.organizationId,
            result: "APPLIED",
            processedAt: now,
          },
        });
        return { status: "applied" };
      }

      if (webhook.priceId !== teamPriceId) {
        await transaction.stripeWebhookDelivery.create({
          data: {
            stripeEventId: webhook.stripeEventId,
            payloadSha256: webhook.payloadSha256,
            eventType: webhook.eventType,
            externalObjectId: webhook.subscriptionId,
            livemode: webhook.livemode,
            organizationId: webhook.organizationId,
            result: "IGNORED",
            processedAt: now,
          },
        });
        return { status: "ignored" };
      }

      const existing = await transaction.billingSubscription.findUnique({
        where: { stripeSubscriptionId: webhook.subscriptionId },
      });
      if (existing && existing.organizationId !== webhook.organizationId) {
        throw new StripeWebhookConflictError(
          "stripe_subscription_scope_mismatch",
        );
      }
      if (
        existing &&
        existing.providerUpdatedAt.getTime() > webhook.eventCreatedAt.getTime()
      ) {
        await transaction.stripeWebhookDelivery.create({
          data: {
            stripeEventId: webhook.stripeEventId,
            payloadSha256: webhook.payloadSha256,
            eventType: webhook.eventType,
            externalObjectId: webhook.subscriptionId,
            livemode: webhook.livemode,
            organizationId: webhook.organizationId,
            billingSubscriptionId: existing.id,
            result: "IGNORED",
            processedAt: now,
          },
        });
        return { status: "ignored" };
      }
      const subscription = await transaction.billingSubscription.upsert({
        where: { stripeSubscriptionId: webhook.subscriptionId },
        create: {
          organizationId: webhook.organizationId,
          billingAccountId: account.id,
          stripeSubscriptionId: webhook.subscriptionId,
          stripePriceId: webhook.priceId,
          plan: "TEAM",
          status: toDatabaseStatus(webhook.status),
          quantity: webhook.quantity,
          cancelAtPeriodEnd: webhook.cancelAtPeriodEnd,
          currentPeriodStart: webhook.currentPeriodStart,
          currentPeriodEnd: webhook.currentPeriodEnd,
          trialEnd: webhook.trialEnd,
          providerUpdatedAt: webhook.eventCreatedAt,
          lastStripeEventId: webhook.stripeEventId,
        },
        update: {
          billingAccountId: account.id,
          stripePriceId: webhook.priceId,
          plan: "TEAM",
          status: toDatabaseStatus(webhook.status),
          quantity: webhook.quantity,
          cancelAtPeriodEnd: webhook.cancelAtPeriodEnd,
          currentPeriodStart: webhook.currentPeriodStart,
          currentPeriodEnd: webhook.currentPeriodEnd,
          trialEnd: webhook.trialEnd,
          providerUpdatedAt: webhook.eventCreatedAt,
          lastStripeEventId: webhook.stripeEventId,
        },
      });
      const entitlementState = await synchronizeEntitlements(
        transaction,
        webhook.organizationId,
        subscription.id,
        now,
      );

      await transaction.activity.createMany({
        data: [
          {
            organizationId: webhook.organizationId,
            source: "STRIPE_WEBHOOK",
            action: "BILLING_SUBSCRIPTION_UPDATED",
            targetType: "BILLING_SUBSCRIPTION",
            targetId: subscription.id,
            requestId: webhook.stripeEventId,
            metadata: {
              status: subscription.status,
              plan: subscription.plan,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            },
          },
          {
            organizationId: webhook.organizationId,
            source: "STRIPE_WEBHOOK",
            action: "BILLING_ENTITLEMENTS_UPDATED",
            targetType: "BILLING_SUBSCRIPTION",
            targetId: subscription.id,
            requestId: webhook.stripeEventId,
            metadata: entitlementState,
          },
        ],
      });
      await transaction.stripeWebhookDelivery.create({
        data: {
          stripeEventId: webhook.stripeEventId,
          payloadSha256: webhook.payloadSha256,
          eventType: webhook.eventType,
          externalObjectId: webhook.subscriptionId,
          livemode: webhook.livemode,
          organizationId: webhook.organizationId,
          billingSubscriptionId: subscription.id,
          result: "APPLIED",
          processedAt: now,
        },
      });
      return { status: "applied" };
    });
  } catch (error: unknown) {
    if (!isPrismaCode(error, "P2002")) throw error;
    const existing = await prisma.stripeWebhookDelivery.findUnique({
      where: { stripeEventId: webhook.stripeEventId },
    });
    if (!existing) throw error;
    if (existing.payloadSha256 !== webhook.payloadSha256) {
      throw new StripeWebhookConflictError("stripe_event_digest_mismatch");
    }
    return { status: "duplicate" };
  }
}

export async function getOrganizationBillingSnapshot(input: {
  organizationId: string;
  prisma?: PrismaClient;
}) {
  const organizationId = uuid.parse(input.organizationId);
  const prisma = input.prisma ?? getPrismaClient();
  const [account, subscriptions, entitlements] = await Promise.all([
    prisma.organizationBillingAccount.findUnique({
      where: { organizationId },
    }),
    prisma.billingSubscription.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.organizationEntitlement.findMany({
      where: { organizationId },
      orderBy: { key: "asc" },
    }),
  ]);
  return { account, subscriptions, entitlements };
}
