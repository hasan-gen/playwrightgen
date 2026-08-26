import { describe, expect, it } from "vitest";

import {
  createGitHubSetupState,
  createPkceChallenge,
  createPkceVerifier,
  GitHubSetupStateError,
  verifyGitHubSetupState,
} from "@/lib/integrations/github/setup-state";

const secret = "github-setup-state-secret-that-is-long-enough";
const identity = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  orgSlug: "acme-quality",
  projectId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
};
const now = new Date("2026-08-26T14:00:00.000Z");

describe("GitHub setup state", () => {
  it("round-trips signed install state only during its intended phase", () => {
    const state = createGitHubSetupState(
      { phase: "install", ...identity },
      secret,
      now,
    );

    expect(
      verifyGitHubSetupState(state, secret, { phase: "install", now }),
    ).toMatchObject({ phase: "install", ...identity });
    expect(() =>
      verifyGitHubSetupState(state, secret, { phase: "oauth", now }),
    ).toThrow(GitHubSetupStateError);
  });

  it("rejects tampering and expiry", () => {
    const state = createGitHubSetupState(
      { phase: "install", ...identity },
      secret,
      now,
    );
    const [payload, signature] = state.split(".");
    expect(() =>
      verifyGitHubSetupState(payload + "x." + signature, secret, { now }),
    ).toThrow(GitHubSetupStateError);
    expect(() =>
      verifyGitHubSetupState(state, secret, {
        now: new Date("2026-08-26T14:11:00.000Z"),
      }),
    ).toThrow(GitHubSetupStateError);
  });

  it("binds OAuth state to a PKCE challenge and installation", () => {
    const verifier = createPkceVerifier();
    const codeChallenge = createPkceChallenge(verifier);
    const state = createGitHubSetupState(
      {
        phase: "oauth",
        ...identity,
        installationId: "456789",
        codeChallenge,
      },
      secret,
      now,
    );

    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(
      verifyGitHubSetupState(state, secret, { phase: "oauth", now }),
    ).toMatchObject({
      phase: "oauth",
      installationId: "456789",
      codeChallenge,
    });
  });
});
