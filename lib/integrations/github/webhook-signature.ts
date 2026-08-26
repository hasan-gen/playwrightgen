import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const signaturePattern = /^sha256=([0-9a-f]{64})$/;

function bodyBuffer(rawBody: string | Uint8Array): Buffer {
  return typeof rawBody === "string"
    ? Buffer.from(rawBody, "utf8")
    : Buffer.from(rawBody);
}

export function sha256WebhookPayload(
  rawBody: string | Uint8Array,
): string {
  return createHash("sha256").update(bodyBuffer(rawBody)).digest("hex");
}

export function verifyGitHubWebhookSignature(input: {
  secret: string;
  rawBody: string | Uint8Array;
  signature: string | null | undefined;
}): boolean {
  const match = input.signature?.trim().match(signaturePattern);
  if (!match || input.secret.length === 0) return false;

  const expected = createHmac("sha256", input.secret)
    .update(bodyBuffer(input.rawBody))
    .digest();
  const received = Buffer.from(match[1], "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}
