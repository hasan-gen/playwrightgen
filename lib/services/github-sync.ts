import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  GitHubWebhookPayloadError,
  type NormalizedGitHubWebhookEvent,
  parseVerifiedGitHubWebhook,
} from "@/lib/validation/github-webhook";

const deliveryIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9-]+$/);
const payloadSha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const eventNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/);

export type GitHubSyncResult = {
  status: "applied" | "duplicate" | "stale" | "ignored";
};

export class GitHubSyncConflictError extends Error {
  readonly code: string;

  constructor(code = "github_webhook_conflict") {
    super(code);
    this.name = "GitHubSyncConflictError";
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
  throw new Error("GitHub synchronization transaction retry exhausted.");
}

function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new GitHubWebhookPayloadError();
  return result.data;
}

function isStale(
  existingProviderTime: Date | null,
  incomingProviderTime: Date | null,
): boolean {
  return Boolean(
    existingProviderTime &&
      incomingProviderTime &&
      incomingProviderTime.getTime() < existingProviderTime.getTime(),
  );
}

async function findDuplicate(
  transaction: Prisma.TransactionClient,
  deliveryId: string,
  payloadSha256: string,
): Promise<GitHubSyncResult | null> {
  const existing = await transaction.gitHubWebhookDelivery.findUnique({
    where: { deliveryId },
  });
  if (!existing) return null;
  if (existing.payloadSha256 !== payloadSha256) {
    throw new GitHubSyncConflictError("github_delivery_digest_mismatch");
  }
  return { status: "duplicate" };
}

async function recordDelivery(
  transaction: Prisma.TransactionClient,
  input: {
    deliveryId: string;
    payloadSha256: string;
    eventName: string;
    action: string;
    event?: NormalizedGitHubWebhookEvent;
    organizationId?: string;
    githubInstallationId?: string;
    result: "APPLIED" | "IGNORED";
    now: Date;
  },
) {
  await transaction.gitHubWebhookDelivery.create({
    data: {
      deliveryId: input.deliveryId,
      payloadSha256: input.payloadSha256,
      eventName: input.eventName,
      action: input.action,
      externalInstallationId: input.event?.externalInstallationId ?? null,
      organizationId: input.organizationId ?? null,
      githubInstallationId: input.githubInstallationId ?? null,
      result: input.result,
      processedAt: input.now,
    },
  });
}

async function applyInstallationEvent(
  transaction: Prisma.TransactionClient,
  input: {
    event: Extract<NormalizedGitHubWebhookEvent, { kind: "installation" }>;
    deliveryId: string;
    payloadSha256: string;
    eventName: string;
    now: Date;
  },
): Promise<GitHubSyncResult> {
  const installation = await transaction.gitHubInstallation.findUnique({
    where: { externalInstallationId: input.event.externalInstallationId },
  });
  if (!installation) {
    await recordDelivery(transaction, {
      ...input,
      action: input.event.action,
      result: "IGNORED",
    });
    return { status: "ignored" };
  }
  if (installation.accountId !== input.event.accountId) {
    throw new GitHubSyncConflictError("github_installation_account_mismatch");
  }
  if (
    isStale(installation.providerUpdatedAt, input.event.providerUpdatedAt)
  ) {
    await recordDelivery(transaction, {
      ...input,
      action: input.event.action,
      organizationId: installation.organizationId,
      githubInstallationId: installation.id,
      result: "IGNORED",
    });
    return { status: "stale" };
  }

  const previousStatus = installation.status;
  const previousSelection = installation.repositorySelection;
  const action = input.event.action;
  const canActivate = installation.status !== "REMOVED";
  const status =
    action === "deleted"
      ? "REMOVED"
      : action === "suspend"
        ? "SUSPENDED"
        : (action === "created" || action === "unsuspend") && canActivate
          ? "ACTIVE"
          : installation.status;

  const updated = await transaction.gitHubInstallation.update({
    where: { id: installation.id },
    data: {
      accountLogin: input.event.accountLogin,
      accountType: input.event.accountType,
      repositorySelection: input.event.repositorySelection,
      status,
      suspendedAt:
        status === "SUSPENDED"
          ? input.event.providerSuspendedAt ?? installation.suspendedAt ?? input.now
          : null,
      removedAt:
        status === "REMOVED"
          ? installation.removedAt ?? input.now
          : null,
      providerUpdatedAt:
        input.event.providerUpdatedAt ?? installation.providerUpdatedAt,
      lastWebhookDeliveryId: input.deliveryId,
      lastSyncedAt: input.now,
    },
  });

  let accessRemovedCount = 0;
  if (status === "REMOVED") {
    const result = await transaction.repositoryConnection.updateMany({
      where: {
        organizationId: installation.organizationId,
        githubInstallationId: installation.id,
        status: { not: "DISCONNECTED" },
      },
      data: {
        status: "ACCESS_REMOVED",
        accessRemovedAt: input.now,
      },
    });
    accessRemovedCount = result.count;
  }

  if (
    previousStatus !== updated.status ||
    previousSelection !== updated.repositorySelection ||
    accessRemovedCount > 0
  ) {
    await transaction.activity.create({
      data: {
        organizationId: installation.organizationId,
        source: "GITHUB_WEBHOOK",
        action: "GITHUB_INSTALLATION_STATUS_CHANGED",
        targetType: "GITHUB_INSTALLATION",
        targetId: installation.id,
        requestId: input.deliveryId,
        metadata: {
          providerAction: action,
          previousStatus,
          newStatus: updated.status,
          previousRepositorySelection: previousSelection,
          newRepositorySelection: updated.repositorySelection,
          accessRemovedCount,
        },
      },
    });
  }

  await recordDelivery(transaction, {
    ...input,
    action,
    organizationId: installation.organizationId,
    githubInstallationId: installation.id,
    result: "APPLIED",
  });
  return { status: "applied" };
}

async function applyRepositoriesEvent(
  transaction: Prisma.TransactionClient,
  input: {
    event: Extract<
      NormalizedGitHubWebhookEvent,
      { kind: "installation_repositories" }
    >;
    deliveryId: string;
    payloadSha256: string;
    eventName: string;
    now: Date;
  },
): Promise<GitHubSyncResult> {
  const installation = await transaction.gitHubInstallation.findUnique({
    where: { externalInstallationId: input.event.externalInstallationId },
  });
  if (!installation) {
    await recordDelivery(transaction, {
      ...input,
      action: input.event.action,
      result: "IGNORED",
    });
    return { status: "ignored" };
  }
  if (
    isStale(installation.providerUpdatedAt, input.event.providerUpdatedAt)
  ) {
    await recordDelivery(transaction, {
      ...input,
      action: input.event.action,
      organizationId: installation.organizationId,
      githubInstallationId: installation.id,
      result: "IGNORED",
    });
    return { status: "stale" };
  }

  const previousSelection = installation.repositorySelection;
  const requiresConservativeRecheck =
    previousSelection === "all" &&
    input.event.repositorySelection === "selected" &&
    input.event.removedRepositoryIds.length === 0;
  const removedIds = [...new Set(input.event.removedRepositoryIds)];
  const addedIds = [...new Set(input.event.addedRepositoryIds)];
  const removal = await transaction.repositoryConnection.updateMany({
    where: {
      organizationId: installation.organizationId,
      githubInstallationId: installation.id,
      status: "ACTIVE",
      ...(requiresConservativeRecheck
        ? {}
        : { externalRepositoryId: { in: removedIds } }),
    },
    data: { status: "ACCESS_REMOVED", accessRemovedAt: input.now },
  });
  const addition =
    installation.status === "ACTIVE" && addedIds.length > 0
      ? await transaction.repositoryConnection.updateMany({
          where: {
            organizationId: installation.organizationId,
            githubInstallationId: installation.id,
            externalRepositoryId: { in: addedIds },
            status: "ACCESS_REMOVED",
          },
          data: { status: "ACTIVE", accessRemovedAt: null },
        })
      : { count: 0 };

  await transaction.gitHubInstallation.update({
    where: { id: installation.id },
    data: {
      repositorySelection: input.event.repositorySelection,
      providerUpdatedAt:
        input.event.providerUpdatedAt ?? installation.providerUpdatedAt,
      lastWebhookDeliveryId: input.deliveryId,
      lastSyncedAt: input.now,
    },
  });

  if (
    previousSelection !== input.event.repositorySelection ||
    removal.count > 0 ||
    addition.count > 0
  ) {
    await transaction.activity.create({
      data: {
        organizationId: installation.organizationId,
        source: "GITHUB_WEBHOOK",
        action: "REPOSITORY_ACCESS_CHANGED",
        targetType: "GITHUB_INSTALLATION",
        targetId: installation.id,
        requestId: input.deliveryId,
        metadata: {
          providerAction: input.event.action,
          previousRepositorySelection: previousSelection,
          newRepositorySelection: input.event.repositorySelection,
          providerAddedCount: addedIds.length,
          providerRemovedCount: removedIds.length,
          restoredConnectionCount: addition.count,
          removedConnectionCount: removal.count,
          conservativeRecheckRequired: requiresConservativeRecheck,
        },
      },
    });
  }

  await recordDelivery(transaction, {
    ...input,
    action: input.event.action,
    organizationId: installation.organizationId,
    githubInstallationId: installation.id,
    result: "APPLIED",
  });
  return { status: "applied" };
}

export async function dispatchGitHubWebhook(input: {
  eventName: unknown;
  deliveryId: unknown;
  payloadSha256: unknown;
  payload: unknown;
  prisma?: PrismaClient;
  now?: Date;
}): Promise<GitHubSyncResult> {
  const eventName = parseInput(eventNameSchema, input.eventName);
  const deliveryId = parseInput(deliveryIdSchema, input.deliveryId);
  const payloadSha256 = parseInput(
    payloadSha256Schema,
    input.payloadSha256,
  );
  const parsed = parseVerifiedGitHubWebhook({
    eventName,
    payload: input.payload,
  });
  const prisma = input.prisma ?? getPrismaClient();
  const now = input.now ?? new Date();

  try {
    return await runSerializable(prisma, async (transaction) => {
      const duplicate = await findDuplicate(
        transaction,
        deliveryId,
        payloadSha256,
      );
      if (duplicate) return duplicate;

      if (parsed.kind === "ignored") {
        await recordDelivery(transaction, {
          deliveryId,
          payloadSha256,
          eventName,
          action: parsed.action,
          result: "IGNORED",
          now,
        });
        return { status: "ignored" };
      }

      if (parsed.event.kind === "installation") {
        return applyInstallationEvent(transaction, {
          event: parsed.event,
          deliveryId,
          payloadSha256,
          eventName,
          now,
        });
      }
      return applyRepositoriesEvent(transaction, {
        event: parsed.event,
        deliveryId,
        payloadSha256,
        eventName,
        now,
      });
    });
  } catch (error: unknown) {
    if (!isPrismaCode(error, "P2002")) throw error;
    const existing = await prisma.gitHubWebhookDelivery.findUnique({
      where: { deliveryId },
    });
    if (!existing || existing.payloadSha256 !== payloadSha256) {
      throw new GitHubSyncConflictError("github_delivery_digest_mismatch");
    }
    return { status: "duplicate" };
  }
}
