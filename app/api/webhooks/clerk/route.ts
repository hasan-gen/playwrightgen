import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

import {
  EnvironmentValidationError,
  validateClerkWebhookEnvironment,
} from "@/lib/env";
import { createWebhookResponder } from "@/lib/operations/webhook-telemetry";
import {
  ClerkSyncConflictError,
  dispatchClerkWebhook,
} from "@/lib/services/clerk-sync";
import { ClerkWebhookPayloadError } from "@/lib/validation/clerk-webhook";

type WebhookRouteDependencies = {
  verify: typeof verifyWebhook;
  dispatch: typeof dispatchClerkWebhook;
};

const defaultDependencies: WebhookRouteDependencies = {
  verify: verifyWebhook,
  dispatch: dispatchClerkWebhook,
};

function readEnvelopeTimestamp(envelope: unknown): unknown {
  if (
    typeof envelope === "object" &&
    envelope !== null &&
    "timestamp" in envelope
  ) {
    return envelope.timestamp;
  }
  return undefined;
}

export async function handleClerkWebhookRequest(
  request: NextRequest,
  dependencies: WebhookRouteDependencies = defaultDependencies,
) {
  const responder = createWebhookResponder("clerk-webhook");
  const errorResponse = (code: string, status: number) =>
    responder.json({ status: "error", code }, { status, code });
  let signingSecret: string;

  try {
    signingSecret =
      validateClerkWebhookEnvironment().CLERK_WEBHOOK_SIGNING_SECRET;
  } catch (error: unknown) {
    if (error instanceof EnvironmentValidationError) {
      return errorResponse("webhook_unavailable", 500);
    }
    return errorResponse("webhook_unavailable", 500);
  }

  let verifiedEvent: Awaited<ReturnType<typeof verifyWebhook>>;
  const verifiedBodyClone = request.clone();
  try {
    verifiedEvent = await dependencies.verify(request, { signingSecret });
  } catch {
    return errorResponse("invalid_signature", 400);
  }

  let eventTimestamp: unknown;
  try {
    eventTimestamp = readEnvelopeTimestamp(await verifiedBodyClone.json());
  } catch {
    return errorResponse("invalid_signature", 400);
  }

  const eventId = request.headers.get("svix-id")?.trim();
  if (!eventId) {
    return errorResponse("invalid_signature", 400);
  }

  try {
    const result = await dependencies.dispatch({
      type: verifiedEvent.type,
      data: verifiedEvent.data,
      eventId,
      eventTimestamp,
    });

    return responder.json(
      { status: "ok", result: result.status },
      { code: result.status },
    );
  } catch (error: unknown) {
    if (
      error instanceof ClerkWebhookPayloadError ||
      error instanceof ClerkSyncConflictError
    ) {
      return errorResponse("invalid_payload", 400);
    }

    return errorResponse("synchronization_failed", 500);
  }
}

export async function POST(request: NextRequest) {
  return handleClerkWebhookRequest(request);
}
