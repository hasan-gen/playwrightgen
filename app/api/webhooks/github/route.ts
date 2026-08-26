import { NextRequest, NextResponse } from "next/server";

import {
  EnvironmentValidationError,
  validateGitHubWebhookEnvironment,
} from "@/lib/env";
import {
  sha256WebhookPayload,
  verifyGitHubWebhookSignature,
} from "@/lib/integrations/github/webhook-signature";
import {
  dispatchGitHubWebhook,
  GitHubSyncConflictError,
} from "@/lib/services/github-sync";
import { GitHubWebhookPayloadError } from "@/lib/validation/github-webhook";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1_000_000;

type GitHubWebhookRouteDependencies = {
  verifySignature: typeof verifyGitHubWebhookSignature;
  hashPayload: typeof sha256WebhookPayload;
  dispatch: typeof dispatchGitHubWebhook;
};

const defaultDependencies: GitHubWebhookRouteDependencies = {
  verifySignature: verifyGitHubWebhookSignature,
  hashPayload: sha256WebhookPayload,
  dispatch: dispatchGitHubWebhook,
};

function errorResponse(code: string, status: number) {
  return NextResponse.json({ status: "error", code }, { status });
}

export async function handleGitHubWebhookRequest(
  request: NextRequest,
  dependencies: GitHubWebhookRouteDependencies = defaultDependencies,
) {
  let webhookSecret: string;
  try {
    webhookSecret = validateGitHubWebhookEnvironment().GITHUB_WEBHOOK_SECRET;
  } catch (error: unknown) {
    if (error instanceof EnvironmentValidationError) {
      return errorResponse("webhook_unavailable", 500);
    }
    return errorResponse("webhook_unavailable", 500);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return errorResponse("payload_too_large", 413);
  }

  let rawBody: Uint8Array;
  try {
    rawBody = new Uint8Array(await request.arrayBuffer());
  } catch {
    return errorResponse("invalid_payload", 400);
  }
  if (rawBody.byteLength > MAX_WEBHOOK_BYTES) {
    return errorResponse("payload_too_large", 413);
  }

  if (
    !dependencies.verifySignature({
      secret: webhookSecret,
      rawBody,
      signature: request.headers.get("x-hub-signature-256"),
    })
  ) {
    return errorResponse("invalid_signature", 401);
  }

  const eventName = request.headers.get("x-github-event")?.trim();
  const deliveryId = request.headers.get("x-github-delivery")?.trim();
  if (!eventName || !deliveryId) {
    return errorResponse("invalid_headers", 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(rawBody),
    );
  } catch {
    return errorResponse("invalid_payload", 400);
  }

  try {
    const result = await dependencies.dispatch({
      eventName,
      deliveryId,
      payloadSha256: dependencies.hashPayload(rawBody),
      payload,
    });
    return NextResponse.json({ status: "ok", result: result.status });
  } catch (error: unknown) {
    if (error instanceof GitHubWebhookPayloadError) {
      return errorResponse("invalid_payload", 400);
    }
    if (error instanceof GitHubSyncConflictError) {
      return errorResponse(error.code, 409);
    }
    return errorResponse("synchronization_failed", 500);
  }
}

export async function POST(request: NextRequest) {
  return handleGitHubWebhookRequest(request);
}
