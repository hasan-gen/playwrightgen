import "server-only";

import { z } from "zod";

const operationalEventSchema = z.object({
  event: z.string().regex(/^[a-z0-9_.-]+$/).max(100),
  requestId: z.string().uuid(),
  status: z.enum(["succeeded", "rejected", "failed"]),
  code: z.string().regex(/^[a-z0-9_.-]+$/).max(100).optional(),
  durationMs: z.number().int().nonnegative().max(3_600_000),
  surface: z.string().regex(/^[a-z0-9_.-]+$/).max(100),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
  totalTokens: z.number().int().nonnegative().nullable().optional(),
  providerRequestId: z.string().max(255).nullable().optional(),
});

export type OperationalEvent = z.input<typeof operationalEventSchema>;

export function logOperationalEvent(
  level: "info" | "warn" | "error",
  event: OperationalEvent,
) {
  const safeEvent = operationalEventSchema.parse(event);
  console[level](JSON.stringify(safeEvent));
}
