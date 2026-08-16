import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type SyncActivityMetadataInput = {
  eventType: string;
  eventId?: string;
  changedFields: readonly string[];
  previousStatus?: string | null;
  newStatus?: string | null;
};

export function buildSyncActivityMetadata(
  input: SyncActivityMetadataInput,
): Prisma.InputJsonObject {
  return {
    providerEventType: input.eventType,
    changedFields: [...new Set(input.changedFields)].sort(),
    ...(input.eventId
      ? { providerEventId: input.eventId }
      : {}),
    ...(input.previousStatus !== undefined
      ? { previousStatus: input.previousStatus }
      : {}),
    ...(input.newStatus !== undefined
      ? { newStatus: input.newStatus }
      : {}),
  };
}

export async function createClerkSyncActivity(
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    action:
      | "ORGANIZATION_UPDATED"
      | "MEMBERSHIP_ROLE_CHANGED"
      | "MEMBERSHIP_REMOVED";
    targetType: "ORGANIZATION" | "MEMBERSHIP";
    targetId: string;
    eventType: string;
    eventId?: string;
    changedFields: readonly string[];
    previousStatus?: string | null;
    newStatus?: string | null;
    source?: "CLERK_WEBHOOK" | "SYSTEM";
  },
): Promise<void> {
  await transaction.activity.create({
    data: {
      organizationId: input.organizationId,
      source: input.source ?? "CLERK_WEBHOOK",
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      requestId: input.eventId ?? null,
      metadata: buildSyncActivityMetadata(input),
    },
  });
}
