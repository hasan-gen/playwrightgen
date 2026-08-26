import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { z } from "zod";

const STATE_TTL_SECONDS = 10 * 60;
export const GITHUB_PKCE_COOKIE = "pwgen_github_setup_pkce";
const statePayloadSchema = z.object({
  version: z.literal(1),
  phase: z.enum(["install", "oauth"]),
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1).max(255),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
  installationId: z.string().regex(/^\d+$/).max(32).optional(),
  codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
}).superRefine((value, context) => {
  if (value.expiresAt <= value.issuedAt) {
    context.addIssue({ code: "custom", message: "Invalid state lifetime." });
  }
  if (value.expiresAt - value.issuedAt > STATE_TTL_SECONDS) {
    context.addIssue({ code: "custom", message: "State lifetime is too long." });
  }
  if (
    value.phase === "oauth" &&
    (!value.installationId || !value.codeChallenge)
  ) {
    context.addIssue({ code: "custom", message: "OAuth state is incomplete." });
  }
  if (
    value.phase === "install" &&
    (value.installationId || value.codeChallenge)
  ) {
    context.addIssue({ code: "custom", message: "Install state is invalid." });
  }
});

export type GitHubSetupState = z.infer<typeof statePayloadSchema>;

export class GitHubSetupStateError extends Error {
  constructor() {
    super("The GitHub setup state is invalid or expired.");
    this.name = "GitHubSetupStateError";
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createPkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function createPkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createGitHubSetupState(
  input: Omit<GitHubSetupState, "version" | "nonce" | "issuedAt" | "expiresAt">,
  secret: string,
  now = new Date(),
): string {
  const issuedAt = Math.floor(now.getTime() / 1_000);
  const payload = base64Url(JSON.stringify({
    ...input,
    version: 1,
    nonce: randomBytes(32).toString("base64url"),
    issuedAt,
    expiresAt: issuedAt + STATE_TTL_SECONDS,
  }));
  return payload + "." + base64Url(signature(payload, secret));
}

export function verifyGitHubSetupState(
  token: string,
  secret: string,
  options?: { phase?: GitHubSetupState["phase"]; now?: Date },
): GitHubSetupState {
  const [payload, receivedSignature, extra] = token.split(".");
  if (!payload || !receivedSignature || extra) {
    throw new GitHubSetupStateError();
  }
  const expected = signature(payload, secret);
  let received: Buffer;
  try {
    received = Buffer.from(receivedSignature, "base64url");
  } catch {
    throw new GitHubSetupStateError();
  }
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new GitHubSetupStateError();
  }

  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new GitHubSetupStateError();
  }
  const parsed = statePayloadSchema.safeParse(raw);
  if (!parsed.success) throw new GitHubSetupStateError();
  const nowSeconds = Math.floor((options?.now ?? new Date()).getTime() / 1_000);
  if (
    parsed.data.issuedAt > nowSeconds + 30 ||
    parsed.data.expiresAt < nowSeconds ||
    (options?.phase && parsed.data.phase !== options.phase)
  ) {
    throw new GitHubSetupStateError();
  }
  return parsed.data;
}
