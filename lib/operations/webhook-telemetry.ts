import "server-only";

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logOperationalEvent } from "@/lib/operations/safe-telemetry";

export function createOperationalResponder(input: {
  event: string;
  surface: string;
}) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  return {
    json(
      body: unknown,
      options: {
        code?: string;
        status?: number;
      } = {},
    ) {
      const status = options.status ?? 200;
      const outcome =
        status >= 500 ? "failed" : status >= 400 ? "rejected" : "succeeded";
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      logOperationalEvent(level, {
        event: input.event,
        requestId,
        status: outcome,
        code: options.code,
        durationMs: Math.max(0, Date.now() - startedAt),
        surface: input.surface,
      });

      return NextResponse.json(body, {
        status,
        headers: {
          "Cache-Control": "no-store",
          "x-request-id": requestId,
        },
      });
    },
  };
}

export function createWebhookResponder(surface: string) {
  return createOperationalResponder({
    event: "webhook.delivery",
    surface,
  });
}
